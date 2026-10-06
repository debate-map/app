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
use crate::{binary_search_insert, can_user_access_entry_json, get_app_state_from_gql_ctx, try_get_user_jwt_data_from_gql_ctx, DropLQWatcherMsg, EntryJSON, IteratorV, LQChange, LQKey, QueryFilter};
use crate::{to_sub_err, SubError};
use crate::{FilterInput, ToOwnedV};
use crate::{LQStorageArc, RLSApplier};
use async_graphql::{Enum, SimpleObject};
use deadpool_postgres::Pool;
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt};
use itertools::Itertools;
use std::collections::HashMap;
use std::{
	any::TypeId,
	cell::RefCell,
	pin::Pin,
	task::{Poll, Waker},
	time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

/*pub struct GQLSet<T> { pub nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }*/

//#[async_trait]
pub trait ListChange<T> {
	fn from(meta: ListChangeCore<T>) -> Self;
	//async fn nodes(&self) -> &Vec<T>;
	/*fn meta(&self) -> GQLSetChangeMeta;
	async fn data(&self) -> &Vec<T>;*/
}
#[derive(Clone)]
pub struct ListChangeCore<T> {
	pub changeType: ListChangeType,
	pub idOfRemoved: Option<String>,
	pub data: Vec<T>,
	/// docId -> hash (note: atm, this is only populated for list-changes of type `FullList`; caller must also supply a cachedEntryHashes arg, but it can be empty)
	pub hashes: HashMap<String, String>,
}
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
