use crate::flume::{Receiver, Sender};
use crate::serde::{de::DeserializeOwned, Deserialize, Serialize};
use crate::serde_json::{json, Map};
use crate::tokio_postgres::{types::ToSql, Client, Row};
use crate::tracing::error;
use crate::utils::mtx::mtx::new_mtx;
use crate::uuid::Uuid;
use crate::{
	anyhow::{bail, Context, Error},
	async_graphql, cf, flume, serde_json, tokio,
	utils::auth::jwt_utils_base::UserJWTData,
};
use crate::{
	async_graphql::{
		async_stream::{self, stream},
		parser::types::Field,
		Object, OutputType, Positioned, Result,
	},
	utils::general::type_aliases::JSONValue,
};
use crate::{
	binary_search_insert, can_user_access_entry_json, get_app_state_from_gql_ctx, here, try_get_user_jwt_data_from_gql_ctx, DropLQWatcherMsg, EntryJSON, IteratorV, JSONValueV, LQChange, LQKey, ListChange, ListChangeCore, ListChangeType, QueryFilter, Stream_WithDropListener, TrackedArc,
};
use crate::{to_sub_err, SubError};
use crate::{FilterInput, ToOwnedV};
use crate::{LQStorageArc, RLSApplier};
use async_graphql::{Enum, SimpleObject};
use blake3::Hasher;
use deadpool_postgres::Pool;
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt};
use itertools::Itertools;
use std::collections::{HashMap, HashSet};
use std::{
	any::TypeId,
	cell::RefCell,
	pin::Pin,
	task::{Poll, Waker},
	time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tracing::info;

pub struct GQLSubOpts {
	pub filter_checker: fn(&QueryFilter) -> Result<(), &'static str>,
}

#[rustfmt::skip]
pub async fn handle_generic_gql_doc_subscription<'a,
	T: 'static + Serialize + DeserializeOwned + Send + Sync + Clone
>(
	ctx: &'a async_graphql::Context<'a>, table_name: &'a str, id: String
) -> impl Stream<Item = Result<Option<T>, SubError>> + 'a {
	let app_state = get_app_state_from_gql_ctx(ctx).clone();
	let jwt_data = try_get_user_jwt_data_from_gql_ctx(ctx).await.unwrap_or_else(|_| None);
	let lq_storage = app_state.live_queries.clone();
	let table_name = table_name.to_owned();

	let filter_json = Some(json!({
		"id": {"equalTo": id}
	}));

	handle_generic_gql_collection_subscription_base::<T, Option<T>>(lq_storage, jwt_data, table_name, filter_json, None, Some(GQLSubOpts { filter_checker: |_| Ok(()) }), |core| {
		let mut data = core.data;
		match core.changeType {
			ListChangeType::FullList => {
				match data.len() {
					0 => None,
					_ => data.pop(),
				}
			},
			ListChangeType::EntryAdded => {
				match data.len() {
					0 => None,
					_ => data.pop(),
				}
			},
			ListChangeType::EntryChanged => {
				match data.len() {
					0 => None,
					_ => data.pop(),
				}
			},
			ListChangeType::EntryRemoved => {
				None
			},
		}
	}).await
}

#[rustfmt::skip]
pub async fn handle_generic_gql_collection_subscription<'a,
	T: 'static + Serialize + DeserializeOwned + Send + Clone,
	ListChangeVariant: 'static + ListChange<T> + Send + Clone + Sync
>(
	ctx: &'a async_graphql::Context<'a>, table_name: &'a str, filter_json: Option<FilterInput>, cached_entry_hashes: Option<HashMap<String, String>>, opts: Option<GQLSubOpts>,
) -> impl Stream<Item = Result<ListChangeVariant, SubError>> + 'a {
	let app_state = get_app_state_from_gql_ctx(ctx).clone();
	let jwt_data = try_get_user_jwt_data_from_gql_ctx(ctx).await.unwrap_or_else(|_| None);
	let lq_storage = app_state.live_queries.clone();
	let table_name = table_name.to_owned();

	handle_generic_gql_collection_subscription_base::<T, ListChangeVariant>(lq_storage, jwt_data, table_name, filter_json, cached_entry_hashes, opts, |core| ListChangeVariant::from(core)).await
}

#[rustfmt::skip]
pub async fn handle_generic_gql_collection_subscription_base<'a,
	T: 'static + Serialize + DeserializeOwned + Send + Clone,
	StreamT: 'static + Send + Clone
>(
	lq_storage: LQStorageArc, jwt_data: Option<UserJWTData>, table_name: String, filter_json: Option<FilterInput>, cached_entry_hashes: Option<HashMap<String, String>>, opts: Option<GQLSubOpts>, list_change_transformer: fn(ListChangeCore<T>) -> StreamT,
) -> impl Stream<Item = Result<StreamT, SubError>> + 'a {
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
		let (initial_jsons_unfiltered, stream_id, sender_for_dropping_lq_watcher, lq_entry_receiver_clone) = {
			let lq_key = LQKey::new(table_name.o(), filter.o());
			/*let mut stream = GQLResultStream::new(storage_wrapper.clone(), collection_name, filter.clone(), GQLSetVariant::from(entries));
			let stream_id = stream.id.clone();*/
			let stream_id = Uuid::new_v4();
			let (initial_jsons_unfiltered, watcher) = match lq_storage.start_lq_watcher(&lq_key, stream_id, Some(&mtx)).await {
				Ok(a) => a,
				Err(err) => {
					// an error in start_lq_watcher is likely from failed data-deserialization; since user may not have permission to access all entries (since this is before filtering), only return a generic error in production
					if cf().env_is_prod {
						error!("{:?}", err);
						return stream_for_error(Error::msg("Failed to start live query watcher. The full error has been logged on the app-server."));
					}
					return stream_for_error(err);
				},
			};

			(initial_jsons_unfiltered, stream_id, lq_storage.channel_for_lq_watcher_drops__sender_base.clone(), watcher.lq_changes_channel_receiver.clone())
		};
		// commented; the return-value of start_lq_watcher is already sorted by id
		//initial_jsons_unfiltered.sort_by_key(|a| a["id"].as_string().unwrap()); // sort entries by id, so there is a consistent ordering seen by the client (stays ordered after changes, by using binary_search_insert)

		// uncomment this, to enable easier debugging (through gql-endpoint "lqDebugMarkers") if this is "being leaked" past where it should be (ie. persisting past subscription init-stage)
		//let initial_jsons_unfiltered = TrackedArc::new("InitialJsons: ".o() + table_name + " -> " + &serde_json::to_string(&filter).unwrap(), initial_jsons_unfiltered, "handle_generic_gql_collection_subscription_base", here!());

		mtx.section("3");
		//let filter_clone = filter.clone();
		let table_name_copy = table_name.o();
		let base_stream = async_stream::stream! {
			let mut rls_applier = RLSApplier::new(table_name_copy.clone(), jwt_data);

			let (mut filtered_current_ids, mut filtered_change_to_send) = {
				//let mut current_jsons_filtered = rls_applier.filter_next_result_set(&current_jsons_unfiltered).unwrap();
				let filtered_initial_jsons: Vec<EntryJSON> = rls_applier.apply_access_filters(initial_jsons_unfiltered.iter().map(|a| a as &EntryJSON).collect_vec());
				let filtered_initial_ids = filtered_initial_jsons.iter().map(|a| a["id"].as_string().unwrap()).collect_vec();
				let filtered_initial_hashes = get_hashes_from_jsons(&filtered_initial_jsons).map_err(to_sub_err)?;

				let (jsons_for_cache_misses, hashes) = split_jsons_based_on_hash_matching(filtered_initial_jsons, filtered_initial_hashes, &cached_entry_hashes);

				let initial_change_to_send = Some(ListChangeCore { changeType: ListChangeType::FullList, idOfRemoved: None, data: jsons_for_cache_misses.into_iter().map(|a| a.up::<T>()).try_collect2().map_err(to_sub_err)?, hashes });
				(filtered_initial_ids, initial_change_to_send)
			};

			// rust seems to keep this in-memory fsr, even though it's not referenced past this point
			// so drop it explicitly (edit: I've confirmed that this fixes the "leak"; eg. each new tab on the sessions page, now only adds ~1mb of post-initialization mem-usage instead of ~450mb!)
			drop(initial_jsons_unfiltered);

			loop {
				// if we don't already have a change to send, wait for one (by listening to live-query-instance changes)
				if filtered_change_to_send.is_none() {
					let lq_change = match lq_entry_receiver_clone.recv_async().await {
						Ok(a) => a,
						Err(_) => break, // if unwrap fails, break loop (since senders are dead anyway)
					};
					match lq_change {
						LQChange::FullList(new_entry_blobs_unfiltered) => {
							let unfiltered_new_entry_jsons: Vec<EntryJSON> = new_entry_blobs_unfiltered.into_iter().map(|a| a.up(&table_name_copy)).try_collect2().map_err(to_sub_err)?;
							let unfiltered_new_entry_jsons_refs = unfiltered_new_entry_jsons.iter().map(|a| a as &EntryJSON).collect_vec();
							let filtered_new_entry_jsons = rls_applier.apply_access_filters(unfiltered_new_entry_jsons_refs);
							let filtered_new_entry_ids = filtered_new_entry_jsons.iter().map(|a| a["id"].as_string().unwrap()).collect_vec();
							let filtered_new_entry_hashes = get_hashes_from_jsons(&filtered_new_entry_jsons).map_err(to_sub_err)?;

							let (jsons_for_cache_misses, hashes) = split_jsons_based_on_hash_matching(filtered_new_entry_jsons, filtered_new_entry_hashes, &cached_entry_hashes);
							
							filtered_current_ids = filtered_new_entry_ids;
							filtered_change_to_send = Some(ListChangeCore { changeType: ListChangeType::FullList, idOfRemoved: None, data: jsons_for_cache_misses.into_iter().map(|a| a.up::<T>()).try_collect2().map_err(to_sub_err)?, hashes });
						},
						LQChange::EntryAdded(id, entry_blob) => {
							let entry_json = entry_blob.up(&table_name_copy).map_err(to_sub_err)?;
							let new_entry_matches = rls_applier.apply_access_filters(vec![&entry_json]).len() > 0;
							if new_entry_matches {
								binary_search_insert(&mut filtered_current_ids, id, |a, b| a.cmp(&b));
								filtered_change_to_send = Some(ListChangeCore { changeType: ListChangeType::EntryAdded, idOfRemoved: None, data: vec![entry_json].into_iter().map(|a| a.up::<T>()).try_collect2().map_err(to_sub_err)?, hashes: HashMap::new() });
							}
						},
						LQChange::EntryChanged(id, entry_blob) => {
							let entry_json = entry_blob.up(&table_name_copy).map_err(to_sub_err)?;
							let entry_index = filtered_current_ids.iter().position(|a| a == &id);
							match entry_index {
								// if given row-id was already part of result-set...
								Some(entry_index) => {
									let new_data_matches = rls_applier.apply_access_filters(vec![&entry_json]).len() > 0;
									match new_data_matches {
										// ...and it's still part of result-set, then EntryChanged
										true => {
											filtered_change_to_send = Some(ListChangeCore { changeType: ListChangeType::EntryChanged, idOfRemoved: None, data: vec![entry_json].into_iter().map(|a| a.up::<T>()).try_collect2().map_err(to_sub_err)?, hashes: HashMap::new() });
										},
										// ...but it's no longer part of result-set, then EntryRemoved
										false => {
											filtered_current_ids.remove(entry_index);
											filtered_change_to_send = Some(ListChangeCore { changeType: ListChangeType::EntryRemoved, idOfRemoved: Some(id), data: vec![], hashes: HashMap::new() });
										},
									}
								},
								// if given row-id wasn't part of result-set...
								None => {
									let new_data_matches = rls_applier.apply_access_filters(vec![&entry_json]).len() > 0;
									// ...but it is now, then EntryAdded
									if new_data_matches {
										binary_search_insert(&mut filtered_current_ids, id, |a, b| a.cmp(&b));
										filtered_change_to_send = Some(ListChangeCore { changeType: ListChangeType::EntryAdded, idOfRemoved: None, data: vec![entry_json].into_iter().map(|a| a.up::<T>()).try_collect2().map_err(to_sub_err)?, hashes: HashMap::new() });
									}
								},
							}
						},
						LQChange::EntryRemoved(id) => {
							let entry_index = filtered_current_ids.iter().position(|a| a == &id);
							match entry_index {
								Some(entry_index) => {
									filtered_current_ids.remove(entry_index);
									filtered_change_to_send = Some(ListChangeCore { changeType: ListChangeType::EntryRemoved, idOfRemoved: Some(id), data: vec![], hashes: HashMap::new() });
								},
								None => {},
							};
						},
					}
				}

				if let Some(change) = filtered_change_to_send {
					//info!("Sending change.data: {}, change.hashes: {}", serde_json::to_string(&change.data).unwrap_or("Failed to serialize data".o()), serde_json::to_string(&change.hashes).unwrap_or("Failed to serialize hashes".o()));
					yield Ok(list_change_transformer(change));
					filtered_change_to_send = None; // reset, awaiting next population
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

fn get_hashes_from_jsons(jsons: &[EntryJSON]) -> Result<Vec<String>, Error> {
	jsons
		.iter()
		.map(|entry_json| {
			let mut hasher = Hasher::new();
			let entry_json_as_string = serde_json::to_string(entry_json)?;
			hasher.update(entry_json_as_string.as_bytes());
			Ok(hasher.finalize().to_hex().to_string())
		})
		.try_collect2::<Vec<String>>()
}

fn split_jsons_based_on_hash_matching(current_entry_jsons: Vec<EntryJSON>, current_entry_hashes: Vec<String>, cached_hashes_from_caller: &Option<HashMap<String, String>>) -> (Vec<EntryJSON>, HashMap<String, String>) {
	let (jsons_for_cache_misses, hashes_for_all_entries_if_hashing_enabled) = match cached_hashes_from_caller {
		Some(cached_hashes) => {
			let mut hashes_for_all_entries: HashMap<String, String> = HashMap::new();
			let mut jsons_for_cache_misses = vec![];
			for (entry_json, entry_json_hash) in current_entry_jsons.into_iter().zip(current_entry_hashes.into_iter()) {
				let entry_id = entry_json["id"].as_string().unwrap();
				// if the entry's current-data hash matches the caller's cache, we skip sending its data and send (back) only the hash
				if let Some(cached_hash) = cached_hashes.get(&entry_id)
					&& cached_hash == &entry_json_hash
				{
					hashes_for_all_entries.insert(entry_id, entry_json_hash);
				}
				// else, send the entry's full data (also send the hash; this way the client can update its cache, without having to integrate the exact hashing function the server uses)
				else {
					jsons_for_cache_misses.push(entry_json.clone());
					hashes_for_all_entries.insert(entry_id, entry_json_hash);
				}
			}
			(jsons_for_cache_misses, hashes_for_all_entries)
		},
		// if graphql caller did not provide a cachedEntryHashes map (not even an empty one), then assume they aren't caching anything (so don't calculate or send hashes for any entries)
		None => (current_entry_jsons, HashMap::new()),
	};
	(jsons_for_cache_misses, hashes_for_all_entries_if_hashing_enabled)
}
