use super::super::lq_instance::{LQEntryWatcher, LQInstance};
use super::lq_group_impl::{LQBatchMessage, LQGroupImpl};
use crate::anyhow::{anyhow, bail, ensure, Error};
use crate::async_graphql::futures_util::task::{Context, Poll};
use crate::async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use crate::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use crate::async_graphql::{Data, MergedObject, MergedSubscription, ObjectType, Result, Schema, SubscriptionType};
use crate::flume::{unbounded, Receiver, Sender};
use crate::indexmap::IndexMap;
use crate::itertools::Itertools;
use crate::serde::de::DeserializeOwned;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::{json, Map};
use crate::store::live_queries_::lq_key::LQKey;
use crate::tokio::sync::{mpsc, Mutex, RwLock};
use crate::tokio::time::{self, Instant};
use crate::tokio_postgres::{Client, Row};
use crate::tracing::{debug, error, info, warn};
use crate::utils::general::extensions::IteratorV;
use crate::utils::general::extensions::ToOwnedV;
use crate::utils::general::type_aliases::{DBPoolArc, FReceiver, FSender, JSONValue};
use crate::utils::mtx::mtx::new_mtx;
use crate::utils::mtx::mtx::Mtx;
use crate::uuid::Uuid;
use crate::{axum, check_lock_order, flume, futures, here, tower, tower_http, EntryJSON, Lock, TBReceiver, TBSender};
use crate::{entry_blob_matches_filter, FilterOp, QueryFilter};
use crate::{get_entries_in_collection, LQGroupStats};
use crate::{serde_json, tokio, RwLock_Tracked};
use crate::{LDChange, TrackedArc};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, WebSocketUpgrade};
use axum::http::header::CONTENT_TYPE;
use axum::http::Method;
use axum::http::{self, Request, Response, StatusCode};
use axum::response::{self, IntoResponse};
use axum::routing::{get, on_service, post, MethodFilter};
use axum::{extract, Router};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, FutureExt, Sink, SinkExt, Stream, StreamExt};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
use std::mem;
use std::pin::Pin;
use std::rc::Rc;
use std::str::FromStr;
use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tower::Service;

type RwLock_Std<T> = std::sync::RwLock<T>;

#[derive(Debug)]
pub enum LQGroup_InMsg {
	/// (lq_key, force_queue_lqi, mtx_parent)
	ScheduleLQIReadOrInitThenBroadcast(LQKey, Option<TrackedArc<LQInstance>>, Option<Mtx>),
	DropLQWatcher(LQKey, Uuid),
	NotifyOfLDChange(LDChange),
	// /// (entry_id [ie. row uuid])
	//RefreshLQDataForX(String),
	/// (batch_index, mtx_parent)
	OnBatchReachedTimeToExecute(usize, Option<Mtx>),

	// from LQBatch (or tokio::spawn block in LQGroupImpl for it)
	/// (batch_index, lqis_in_batch)
	OnBatchCompleted(usize, Vec<TrackedArc<LQInstance>>),
}
#[derive(Debug)]
pub enum LQGroup_OutMsg {
	/// (lq_key, lqi, just_initialized)
	LQInstanceIsInitialized(LQKey, TrackedArc<LQInstance>, bool),
}
impl Clone for LQGroup_OutMsg {
	fn clone(&self) -> Self {
		match self {
			LQGroup_OutMsg::LQInstanceIsInitialized(lq_key, lqi, just_initialized) => LQGroup_OutMsg::LQInstanceIsInitialized(lq_key.clone(), lqi.clone("LQGroup_OutMsg.clone", here!()), *just_initialized),
		}
	}
}

// sync docs with LQGroupImpl
/// A "live query group" is essentially a set of live-queries that all have the same "generic signature" (ie. table + filter operations with value slots), but which have different values assigned to each slot.
/// The `LQGroup` struct is the "public interface" for the lq-group. Its methods are mostly async, with each "sending a message" to the "inner" `LQGroupImpl` struct, which queues up a set of calls and then processes them as a batch.
/// When the batched processing in the `LQGroupImpl` completes, it sends a message back to the "waiting" `LQGroup`s, which then are able to have their async methods return.
pub struct LQGroup {
	inner: Mutex<LQGroupImpl>,

	pub lq_key: LQKey,
	messages_in_sender: FSender<LQGroup_InMsg>,
	messages_in_receiver: FReceiver<LQGroup_InMsg>,
	messages_out_sender: TBSender<LQGroup_OutMsg>,
	// KEEP THIS COMMENTED; we want the initial receiver to immediately be dropped, otherwise its staying alive but never reading the channel-messages causes them to pile up, causing a memory leak
	//messages_out_receiver: TBReceiver<LQGroup_OutMsg>,
}
impl LQGroup {
	fn new(lq_key: LQKey, db_pool: DBPoolArc) -> Self {
		let (s1, r1): (FSender<LQGroup_InMsg>, FReceiver<LQGroup_InMsg>) = flume::unbounded();
		// 2024-02-05: 1k capacity too small; upped to 10k (not yet certain if issue was from capacity being too small, or some sort of deadlock)
		//let (mut s2, r2): (ABSender<LQGroup_OutMsg>, ABReceiver<LQGroup_OutMsg>) = async_broadcast::broadcast(1);
		let (s2, _r2): (TBSender<LQGroup_OutMsg>, TBReceiver<LQGroup_OutMsg>) = tokio::sync::broadcast::channel(10000);

		// nothing ever "consumes" the messages in the `messages_out` channel, so we must enable overflow (ie. deletion of old entries once queue-size cap is reached)
		//s2.set_overflow(true);

		//let lq_key = LQKey::new(table_name, filter);
		let new_self = Self {
			inner: Mutex::new(LQGroupImpl::new(lq_key.clone(), db_pool, s1.clone(), s2.clone())),
			lq_key,
			messages_in_sender: s1,
			messages_in_receiver: r1,
			messages_out_sender: s2,
			//messages_out_receiver: r2,
		};
		new_self
	}
	pub fn new_in_arc(lq_key: LQKey, db_pool: DBPoolArc) -> Arc<Self> {
		let wrapper = Arc::new(Self::new(lq_key, db_pool));

		tokio::spawn(Self::message_loop(wrapper.clone()));

		wrapper
	}

	// message-handling
	// ==========

	fn send_message(&self, message: LQGroup_InMsg) {
		// unwrap is safe; LQGroup instances are never dropped, so the channel is also never dropped/closed
		self.messages_in_sender.send(message).unwrap();
	}

	async fn message_loop(self: Arc<Self>) {
		loop {
			let message = self.messages_in_receiver.recv_async().await.unwrap();
			let mut inner = self.inner.lock().await;
			let msg_as_str = format!("{:?}", message);
			inner.notify_message_processed_or_sent(msg_as_str, false);
			match message {
				LQGroup_InMsg::ScheduleLQIReadOrInitThenBroadcast(lq_key, force_queue_lqi, parent_mtx) => {
					inner.schedule_lqi_read_or_init_then_broadcast(&lq_key, force_queue_lqi, parent_mtx.as_ref()).await;
					// Once lq-instance is initialized, LQGroupImpl will send a LQGroup_OutMsg::LQInstanceIsInitialized message back out.
					// That message will be seen by the `get_initialized_lqi_for_key` func below, which will then return the lqi to the async caller.
				},
				LQGroup_InMsg::DropLQWatcher(lq_key, uuid) => {
					inner.drop_lq_watcher(&lq_key, uuid).await;
				},
				LQGroup_InMsg::NotifyOfLDChange(change) => {
					inner.notify_of_ld_change(&change).await;
				},
				/*LQGroup_InMsg::RefreshLQDataForX(entry_id) => {
					// ignore error; if db-request fails, we leave it up to user to retry (it's a temporary workaround anyway)
					let _ = inner.refresh_lq_data_for_x(&entry_id).await;
				},*/
				// from LQBatch (or tokio::spawn block in LQGroupImpl for it)
				LQGroup_InMsg::OnBatchReachedTimeToExecute(batch_i, mtx_parent) => {
					inner.execute_batch(batch_i, mtx_parent.as_ref()).await;
				},
				LQGroup_InMsg::OnBatchCompleted(batch_i, lqis_in_batch) => {
					inner.on_batch_completed(batch_i, lqis_in_batch).await;
				},
			}
		}
	}

	// Helper functions, outside of LQGroupImpl. This is the appropriate location for functions where either:
	// 1) The function is intended to be called by external callers/threads.
	// 2) The function is async, and will be "waiting" for a substantial length of time (too long to await in message-loop)
	// ==========

	pub async fn get_initialized_lqi_for_key(&self, lq_key: &LQKey, force_queue_lqi: Option<TrackedArc<LQInstance>>, mtx_p: Option<Mtx>) -> TrackedArc<LQInstance> {
		let mut new_receiver = self.messages_out_sender.subscribe();
		self.send_message(LQGroup_InMsg::ScheduleLQIReadOrInitThenBroadcast(lq_key.clone(), force_queue_lqi, mtx_p));
		loop {
			#[allow(irrefutable_let_patterns)] // needed atm, since only one enum-option defined
			if let LQGroup_OutMsg::LQInstanceIsInitialized(lq_key2, lqi, _just_initialized) = new_receiver.recv().await.unwrap()
				&& lq_key2 == *lq_key
			{
				return lqi;
			}
		}
	}
	/// Note: The returned Vec is already sorted by id.
	pub async fn start_lq_watcher<'a>(&self, lq_key: &LQKey, stream_id: Uuid, mtx_p: Option<&Mtx>) -> Result<(Vec<EntryJSON>, LQEntryWatcher), Error> {
		new_mtx!(mtx, "1:get or create lqi", mtx_p);
		/*new_mtx!(mtx2, "<proxy>", Some(&mtx));
		let lqi = self.get_initialized_lqi_for_key(&lq_key, Some(tx2)).await;*/
		let lqi = self.get_initialized_lqi_for_key(&lq_key, None, Some(mtx.proxy())).await; //.clone("start_lq_watcher", here!());

		mtx.section("2:get current result-set");
		let result_entry_blobs = lqi.last_entries.read().await.clone();

		mtx.section("3:convert result-set to rust types");
		let result_entry_jsons: Vec<EntryJSON> = result_entry_blobs.iter().map(|a| a.clone().up(&lq_key.table_name)).try_collect2().map_err(|err| {
			let err_new = err.context("Got an error within start_lq_watcher -> json_maps_to_typed_entries, implying invalid/corrupted field data in database.");
			error!("{:?}", err_new);
			err_new
		})?;

		mtx.section("4:get or create watcher, for the given stream");
		//let watcher = entry.get_or_create_watcher(stream_id);
		let entries_count = result_entry_blobs.len();
		let (watcher, _watcher_is_new, new_watcher_count) = lqi.get_or_create_watcher(stream_id, result_entry_blobs).await;
		let watcher_info_str = format!("@watcher_count_for_entry:{} @collection:{} @filter:{:?} @entries_count:{}", new_watcher_count, lq_key.table_name, lq_key.filter, entries_count);
		debug!("LQ-watcher started. {}", watcher_info_str);

		Ok((result_entry_jsons, watcher.clone()))
	}

	pub fn drop_lq_watcher(&self, lq_key: LQKey, stream_id: Uuid) {
		self.send_message(LQGroup_InMsg::DropLQWatcher(lq_key, stream_id));
	}
	pub fn notify_of_ld_change(&self, change: LDChange) {
		self.send_message(LQGroup_InMsg::NotifyOfLDChange(change));
	}
	/*pub fn refresh_lq_data_for_x(&self, entry_id: String) {
		self.send_message(LQGroup_InMsg::RefreshLQDataForX(entry_id));
	}*/

	/// Reacquires the data for a given doc/row from the database, and force-updates the live-query entry for it.
	/// (temporary fix for bug where a `nodes/XXX` db-entry occasionally gets "stuck" -- ie. its live-query entry doesn't update, despite its db-data changing)
	pub async fn refresh_lq_data_for_x(&self, entry_id: &str) -> Result<(), Error> {
		/*new_mtx!(mtx, "1:get live_queries", None, Some(format!("@table_name:{} @entry_id:{}", self.table_name, entry_id)));
		mtx.log_call(None);*/

		// get read-lock for self.query_instances, clone the collection, then drop the lock immediately (to avoid deadlock with function-trees we're about to call)
		let live_queries: IndexMap<LQKey, TrackedArc<LQInstance>> = self.inner.lock().await.get_lqis_committed_cloned(); // in cloning the IndexMap, all the keys and value are cloned as well

		for (lq_key, lqi) in live_queries.iter() {
			let entry_for_id = lqi.get_last_entry_with_id(entry_id).await;
			// if this lq-instance has no entries with the entry-id we want to refresh, then ignore it
			if entry_for_id.is_none() {
				continue;
			}

			//self.get_or_create_lq_instance_in_progressing_batch(lq_key, Some(lqi.clone()), None).await?;
			// first call retrieves the lqi (presumably from the commited-lqis list)
			//let lqi = self.get_initialized_lqi_for_key(lq_key, None, None).await;
			// this call forces the lqi to be re-queued in new/progressing batch
			self.get_initialized_lqi_for_key(lq_key, Some(lqi.clone("refresh_lq_data_for_x", here!())), None).await;

			let new_data = match lqi.get_last_entry_with_id(entry_id).await {
				None => {
					warn!("While force-refreshing lq-data, the new batch completed, but no entry was found with the given id. This could mean the entry was just deleted, but more likely it's a bug.");
					continue;
				},
				Some(a) => a,
			};
			info!("While force-refreshing lq-data, got new-data. @table:{} @new_data:{:?}", self.lq_key.table_name, new_data);

			let new_data_as_change = LDChange {
				table: self.lq_key.table_name.clone(),
				kind: "update".to_owned(),
				columnnames: Some(new_data.keys().map(|a| a.clone()).collect()),
				columnvalues: Some(new_data.values().map(|a| a.clone()).collect()),
				// marking the type as "unknown" is fine; the type is only needed when converting from-lds data into proper `JSONValue`s
				columntypes: Some(new_data.keys().map(|_| "unknown".to_owned()).collect()),
				oldkeys: None,
				schema: "".to_owned(),
				needs_wal2json_jsonval_fixes: Some(false), // don't apply fixes, since fixes already applied (if needed) during initial ingestion ("columntypes" being "unknown" precludes the fixes from running anyway)
			};

			lqi.on_table_changed(&new_data_as_change, None).await;
		}
		Ok(())
	}

	pub async fn get_stats(&self) -> Result<LQGroupStats, Error> {
		/*let mut result = self.inner.lock().await.get_stats().await?;
		result.channel_messages_in = self.messages_in_receiver.len() as u64;
		result.channel_messages_out = self.messages_out_receiver.len() as u64;
		Ok(result)*/
		self.inner.lock().await.get_stats().await
	}
}
