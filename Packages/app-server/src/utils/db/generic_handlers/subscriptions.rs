use deadpool_postgres::Pool;
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt};
use metrics::{counter, histogram};
use rust_shared::async_graphql::{
	async_stream::{self, stream},
	parser::types::Field,
	Enum, Object, OutputType, Positioned, Result,
};
use rust_shared::flume::{Receiver, Sender};
use rust_shared::serde::{de::DeserializeOwned, Deserialize, Serialize};
use rust_shared::serde_json::{json, Map};
use rust_shared::tokio_postgres::{types::ToSql, Client, Row};
use rust_shared::uuid::Uuid;
use rust_shared::SubError;
use rust_shared::{
	anyhow::{bail, Context, Error},
	async_graphql,
	domains::DomainsConstants,
	flume, new_mtx, serde_json, to_sub_err, tokio,
	utils::{auth::jwt_utils_base::UserJWTData, general_::extensions::ToOwnedV, type_aliases::JSONValue},
};
use std::{
	any::TypeId,
	cell::RefCell,
	pin::Pin,
	task::{Poll, Waker},
	time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tracing::error;

use super::super::{
	filter::{FilterInput, QueryFilter},
	rls::{
		rls_applier::{self},
		rls_policies::UsesRLS,
	},
};
use crate::{
	db::general::sign_in_::jwt_utils::try_get_user_jwt_data_from_gql_ctx,
	store::{
		live_queries::{DropLQWatcherMsg, LQStorage, LQStorageArc},
		live_queries_::lq_key::LQKey,
		storage::{get_app_state_from_gql_ctx, AppStateArc},
	},
	utils::{db::rls::rls_applier::RLSApplier, type_aliases::PGClientObject},
};

// helpers (temp till using graphlink-rust package)
// ==========

#[derive(Enum, Copy, Clone, Eq, PartialEq)]
pub enum ListChangeType {
	#[graphql(name = "FullList")]
	FullList,
	#[graphql(name = "EntryAdded")]
	EntryAdded,
	#[graphql(name = "EntryChanged")]
	EntryChanged,
	#[graphql(name = "EntryRemoved")]
	EntryRemoved,
}

#[macro_export]
macro_rules! envopt {
	($name:expr) => {
		option_env!($name)
	};
}

#[macro_export]
macro_rules! gql_set_impl {
	($my_type:ident) => {
		pastey::paste! {
			#[derive(Clone)]
			pub struct [<GQLSet_ $my_type>] {
				pub nodes: Vec<$my_type>,
			}

			#[cfg_attr(not(feature = "rust-analyzer"), Object)]
			impl [<GQLSet_ $my_type>] {
				// old structure
				async fn nodes(&self) -> &Vec<$my_type> {
					&self.nodes
				}

				// new structure (for now, just stub for it though)
				async fn changeType(&self) -> &$crate::utils::db::generic_handlers::subscriptions::ListChangeType {
					&$crate::utils::db::generic_handlers::subscriptions::ListChangeType::FullList
				}
				async fn idOfRemoved(&self) -> &Option<String> {
					&None
				}
				async fn data(&self) -> &Vec<$my_type> {
					&self.nodes
				}
				async fn hashes(&self) -> &std::collections::HashMap<String, String> {
					use std::collections::HashMap;
					static EMPTY_HASHMAP: std::sync::LazyLock<HashMap<String, String>> = std::sync::LazyLock::new(|| HashMap::new());
					&EMPTY_HASHMAP
				}
			}

			impl GQLSet<$my_type> for [<GQLSet_ $my_type>] {
				fn from(entries: Vec<$my_type>) -> [<GQLSet_ $my_type>] {
					Self { nodes: entries }
				}
				fn nodes(&self) -> &Vec<$my_type> {
					&self.nodes
				}
			}
		}
	};
}

// helpers
// ==========

/*pub struct GQLSet<T> { pub nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }*/

//#[async_trait]
pub trait GQLSet<T> {
	fn from(entries: Vec<T>) -> Self;
	//async fn nodes(&self) -> &Vec<T>;
	fn nodes(&self) -> &Vec<T>;
}

pub fn json_values_to_typed_entries<T: From<Row> + Serialize + DeserializeOwned>(json_entries: Vec<JSONValue>) -> Result<Vec<T>, Error> {
	let mut result = Vec::new();
	for entry in json_entries {
		let entry = serde_json::from_value(entry.clone()).with_context(|| format!("JSON structure failed to deserialize:{}", entry.to_string()))?;
		result.push(entry);
	}
	Ok(result)
}
pub fn json_maps_to_typed_entries<T: From<Row> + Serialize + DeserializeOwned>(json_entries: Vec<Map<String, JSONValue>>) -> Result<Vec<T>, Error> {
	let mut result = Vec::new();
	for entry in json_entries {
		let entry = serde_json::Value::Object(entry);
		let entry = serde_json::from_value(entry.clone()).with_context(|| format!("JSON structure failed to deserialize:{}", entry.to_string()))?;
		result.push(entry);
	}
	Ok(result)
}

pub struct Stream_WithDropListener<'a, T> {
	inner_stream: Pin<Box<dyn Stream<Item = T> + 'a + Send>>,
	table_name: String,
	filter: QueryFilter,
	stream_id: Uuid,
	sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>,
}
impl<'a, T> Stream_WithDropListener<'a, T> {
	pub fn new(inner_stream_new: impl Stream<Item = T> + 'a + Send, table_name: &str, filter: QueryFilter, stream_id: Uuid, sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>) -> Self {
		Self { inner_stream: Box::pin(inner_stream_new), table_name: table_name.to_owned(), filter, stream_id, sender_for_lq_watcher_drops }
	}
}
impl<'a, T> Drop for Stream_WithDropListener<'a, T> {
	fn drop(&mut self) {
		//println!("Stream_WithDropListener got dropped. @address:{:p} @table:{} @filter:{:?}", self, self.table_name, self.filter);

		// the receivers of the channel below may all be dropped, causing the `send()` to return a SendError; ignore this, since it is expected (for the streams returned by `stream_for_error`)
		#[allow(unused_must_use)]
		{
			self.sender_for_lq_watcher_drops.send(DropLQWatcherMsg::Drop_ByCollectionAndFilterAndStreamID(self.table_name.clone(), self.filter.clone(), self.stream_id));
		}
	}
}
impl<'a, T> Stream for Stream_WithDropListener<'a, T> {
	type Item = T;
	fn poll_next(mut self: Pin<&mut Self>, c: &mut std::task::Context<'_>) -> Poll<Option<<Self as Stream>::Item>> {
		self.inner_stream.as_mut().poll_next(c)
	}
}

// generic handlers
// ==========

pub async fn handle_generic_gql_doc_subscription<'a, T: 'static + UsesRLS + From<Row> + Serialize + DeserializeOwned + Send + Sync + Clone>(ctx: &'a async_graphql::Context<'a>, table_name: &'a str, id: String) -> impl Stream<Item = Result<Option<T>, SubError>> + 'a {
	//let ctx: &'static async_graphql::Context<'_> = Box::leak(Box::new(ctx));
	let app_state = get_app_state_from_gql_ctx(ctx).clone();
	let jwt_data = try_get_user_jwt_data_from_gql_ctx(ctx).await.unwrap_or_else(|_| None);
	let lq_storage = app_state.live_queries.clone();
	let table_name = table_name.to_owned();
	handle_generic_gql_doc_subscription_base(lq_storage, jwt_data, table_name, id).await
}
pub async fn handle_generic_gql_doc_subscription_base<'a, T: 'static + UsesRLS + From<Row> + Serialize + DeserializeOwned + Send + Sync + Clone>(
	lq_storage: LQStorageArc, jwt_data: Option<UserJWTData>, table_name: String, id: String,
) -> impl Stream<Item = Result<Option<T>, SubError>> + 'a {
	let result = tokio::spawn(async move {
		let table_name = &table_name;

		new_mtx!(mtx, "1", None, Some(format!("@table_name:{table_name} @id:{id}")));
		let stream_for_error = |err: Error| {
			//return stream::once(async { Err(err) });
			let base_stream = async_stream::stream! {
				//yield Err(SubError::new(err.to_string()));
				yield Err(to_sub_err(err));
			};
			let (s1, _r1): (Sender<DropLQWatcherMsg>, Receiver<DropLQWatcherMsg>) = flume::unbounded();
			Stream_WithDropListener::<'static, Result<Option<T>, SubError>>::new(base_stream, table_name, QueryFilter::empty(), Uuid::new_v4(), s1)
		};

		mtx.section("2");
		//tokio::time::sleep(std::time::Duration::from_millis(123456789)).await; // temp
		let filter_json = json!({"id": {"equalTo": id}});
		let filter = match QueryFilter::from_filter_input(&filter_json) {
			Ok(a) => a,
			Err(err) => return stream_for_error(err),
		};
		//let filter = QueryFilter::from_filter_input_opt(&Some(filter_json)).unwrap();
		let (entry_as_type, stream_id, sender_for_dropping_lq_watcher, lq_entry_receiver_clone) = {
			let lq_key = LQKey::new(table_name.o(), filter.o());
			/*let mut stream = GQLResultStream::new(storage_wrapper.clone(), table_name, filter.clone(), GQLSetVariant::from(entries));
			let stream_id = stream.id.clone();*/
			let stream_id = Uuid::new_v4();
			//let (mut entries_as_type, watcher) = storage.start_lq_watcher::<T>(table_name, &filter, stream_id, ctx, Some(&mtx)).await;
			let (mut entries_as_type, watcher) = match lq_storage.start_lq_watcher::<T>(&lq_key, stream_id, Some(&mtx)).await {
				Ok(a) => a,
				Err(err) => {
					// an error in start_lq_watcher is likely from failed data-deserialization; since user may not have permission to access all entries (since this is before filtering), only return a generic error in production
					if DomainsConstants::new().on_server_and_prod {
						error!("{:?}", err);
						return stream_for_error(Error::msg("Failed to start live query watcher. The full error has been logged to the app-server."));
					}
					return stream_for_error(err);
				},
			};
			let entry_as_type = entries_as_type.pop();

			(entry_as_type, stream_id, lq_storage.channel_for_lq_watcher_drops__sender_base.clone(), watcher.new_entries_channel_receiver.clone())
		};

		mtx.section("3");
		//let filter_clone = filter.clone();
		let base_stream = async_stream::stream! {
			let mut rls_applier = RLSApplier::new(jwt_data);
			if let (next_result, _changed) = rls_applier.filter_next_result_for_doc(entry_as_type) {
				yield Ok(next_result);
			}

			loop {
				let next_entries = match lq_entry_receiver_clone.recv_async().await {
					Ok(a) => a,
					Err(_) => break, // if unwrap fails, break loop (since senders are dead anyway)
				};
				let mut next_entries_as_type: Vec<T> = json_maps_to_typed_entries(next_entries).map_err(to_sub_err)?;
				let next_entry_as_type: Option<T> = next_entries_as_type.pop();

				// only yield next-result if it has changed after filtering (otherwise seeing an "unchanged update" leaks knowledge that a hidden, matching entry was changed)
				if let (next_result, changed) = rls_applier.filter_next_result_for_doc(next_entry_as_type) && changed {
					yield Ok(next_result);
				}
			}
		};
		Stream_WithDropListener::new(base_stream, table_name, filter, stream_id, sender_for_dropping_lq_watcher)
		//base_stream
	})
	.await
	.unwrap();
	result
}

pub struct GQLSubOpts {
	pub filter_checker: fn(&QueryFilter) -> Result<(), &'static str>,
}

pub async fn handle_generic_gql_collection_subscription<'a, T: 'static + UsesRLS + From<Row> + Serialize + DeserializeOwned + Send + Clone, GQLSetVariant: 'static + GQLSet<T> + Send + Clone + Sync>(
	ctx: &'a async_graphql::Context<'a>, table_name: &'a str, filter_json: Option<FilterInput>, opts: Option<GQLSubOpts>,
) -> impl Stream<Item = Result<GQLSetVariant, SubError>> + 'a {
	//) -> Stream_WithDropListener<'a, Result<GQLSetVariant, SubError>> {
	let app_state = get_app_state_from_gql_ctx(ctx).clone();
	let jwt_data = try_get_user_jwt_data_from_gql_ctx(ctx).await.unwrap_or_else(|_| None);
	let lq_storage = app_state.live_queries.clone();
	let table_name = table_name.to_owned();
	handle_generic_gql_collection_subscription_base(lq_storage, jwt_data, table_name, filter_json, opts).await
}
pub async fn handle_generic_gql_collection_subscription_base<'a, T: 'static + UsesRLS + From<Row> + Serialize + DeserializeOwned + Send + Clone, GQLSetVariant: 'static + GQLSet<T> + Send + Clone + Sync>(
	lq_storage: LQStorageArc, jwt_data: Option<UserJWTData>, table_name: String, filter_json: Option<FilterInput>, opts: Option<GQLSubOpts>,
) -> impl Stream<Item = Result<GQLSetVariant, SubError>> + 'a {
	//) -> Stream_WithDropListener<'a, Result<GQLSetVariant, SubError>> {
	let result = tokio::spawn(async move {
		let table_name = &table_name; // is this actually needed?

		new_mtx!(mtx, "1", None, Some(format!("@table_name:{table_name} @filter:{filter_json:?}")));
		let stream_for_error = |err: Error| {
			//return stream::once(async { Err(err) });
			let base_stream = async_stream::stream! {
				//yield Err(SubError::new(err.to_string()));
				yield Err(to_sub_err(err));
			};
			let (s1, _r1): (Sender<DropLQWatcherMsg>, Receiver<DropLQWatcherMsg>) = flume::unbounded();
			Stream_WithDropListener::new(base_stream, table_name, QueryFilter::empty(), Uuid::new_v4(), s1)
		};

		mtx.section("2");
		let filter = match QueryFilter::from_filter_input_opt(&filter_json) {
			Ok(a) => a,
			Err(err) => return stream_for_error(err),
		};
		if let Some(opts) = opts {
			match (opts.filter_checker)(&filter) {
				Ok(_) => {},
				Err(err) => return stream_for_error(Error::msg(err)),
			}
		}

		//let filter = QueryFilter::from_filter_input_opt(&filter_json).unwrap();
		let (entries_as_type, stream_id, sender_for_dropping_lq_watcher, lq_entry_receiver_clone) = {
			let lq_key = LQKey::new(table_name.o(), filter.o());
			/*let mut stream = GQLResultStream::new(storage_wrapper.clone(), collection_name, filter.clone(), GQLSetVariant::from(entries));
			let stream_id = stream.id.clone();*/
			let stream_id = Uuid::new_v4();
			let (entries_as_type, watcher) = match lq_storage.start_lq_watcher::<T>(&lq_key, stream_id, Some(&mtx)).await {
				Ok(a) => a,
				Err(err) => {
					// an error in start_lq_watcher is likely from failed data-deserialization; since user may not have permission to access all entries (since this is before filtering), only return a generic error in production
					if DomainsConstants::new().on_server_and_prod {
						error!("{:?}", err);
						return stream_for_error(Error::msg("Failed to start live query watcher. The full error has been logged on the app-server."));
					}
					return stream_for_error(err);
				},
			};

			(entries_as_type, stream_id, lq_storage.channel_for_lq_watcher_drops__sender_base.clone(), watcher.new_entries_channel_receiver.clone())
		};

		mtx.section("3");
		//let filter_clone = filter.clone();
		let base_stream = async_stream::stream! {
			let mut rls_applier = RLSApplier::new(jwt_data);
			if let (next_result, _changed) = rls_applier.filter_next_result_for_collection(entries_as_type) {
				yield Ok(GQLSetVariant::from(next_result));
			}

			loop {
				let next_entries = match lq_entry_receiver_clone.recv_async().await {
					Ok(a) => a,
					Err(_) => break, // if unwrap fails, break loop (since senders are dead anyway)
				};
				let next_entries_as_type: Vec<T> = json_maps_to_typed_entries(next_entries).map_err(to_sub_err)?;

				// only yield next-result if it has changed after filtering (otherwise seeing an "unchanged update" leaks knowledge that a hidden, matching entry was changed)
				if let (next_result, changed) = rls_applier.filter_next_result_for_collection(next_entries_as_type) && changed {
					yield Ok(GQLSetVariant::from(next_result));
				}
			}
		};
		Stream_WithDropListener::new(base_stream, table_name, filter, stream_id, sender_for_dropping_lq_watcher)
		//base_stream
	})
	.await
	.unwrap();
	result
}
