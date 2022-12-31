use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
use std::mem;
use std::pin::Pin;
use std::rc::Rc;
use std::str::FromStr;
use std::sync::Arc;
use std::sync::atomic::{Ordering, AtomicU64, AtomicI64};
use std::time::Duration;
use rust_shared::async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use rust_shared::async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::mtx::mtx::Mtx;
use rust_shared::{futures, axum, tower, tower_http, Lock, check_lock_order, flume, new_mtx};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use rust_shared::flume::{Sender, Receiver, unbounded};
use rust_shared::indexmap::IndexMap;
use rust_shared::itertools::Itertools;
use rust_shared::utils::type_aliases::{JSONValue, FReceiver, FSender};
use rust_shared::{utils::time::time_since_epoch_ms, RwLock_Tracked, tokio, serde_json};
use rust_shared::serde::de::DeserializeOwned;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Map};
use rust_shared::tokio::sync::{mpsc, Mutex, RwLock};
use rust_shared::tokio::time::{Instant, self};
use rust_shared::tokio_postgres::{Client, Row};
use tower::Service;
use tower_http::cors::{CorsLayer, Origin};
use rust_shared::async_graphql::futures_util::task::{Context, Poll};
use rust_shared::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::body::{boxed, BoxBody, HttpBody};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, RequestParts, WebSocketUpgrade};
use axum::http::{self, Request, Response, StatusCode};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, Stream, StreamExt, FutureExt};
use tracing::{info, warn, debug, error};
use rust_shared::anyhow::{anyhow, Error, bail, ensure};
use rust_shared::uuid::Uuid;

use crate::store::live_queries_::lq_key::LQKey;
use crate::utils::db::filter::{entry_matches_filter, QueryFilter, FilterOp};
use crate::utils::db::handlers::json_maps_to_typed_entries;
use crate::utils::db::pg_stream_parsing::{LDChange};
use crate::utils::db::queries::{get_entries_in_collection};
use crate::utils::general::general::{AtomicF64};
use crate::utils::type_aliases::{PGClientObject, ABReceiver, ABSender, DBPoolArc};

use super::lq_group_impl::{LQGroupImpl, LQBatchMessage};
use super::super::lq_instance::{LQInstance, LQEntryWatcher};

type RwLock_Std<T> = std::sync::RwLock<T>;

#[derive(Debug)]
pub enum LQGroup_InMsg {
    /// (lq_key, force_queue_lqi, mtx_parent)
    ScheduleLQIReadOrInitThenBroadcast(LQKey, Option<Arc<LQInstance>>, Option<Mtx>),
    DropLQWatcher(LQKey, Uuid),
    NotifyOfLDChange(LDChange),
    // /// (entry_id [ie. row uuid])
    //RefreshLQDataForX(String),

    /// (batch_index, mtx_parent)
    OnBatchReachedTimeToExecute(usize, Option<Mtx>),

    // from LQBatch (or tokio::spawn block in LQGroupImpl for it)
    /// (batch_index, lqis_in_batch)
    OnBatchCompleted(usize, Vec<Arc<LQInstance>>),
}
#[derive(Debug, Clone)]
pub enum LQGroup_OutMsg {
    /// (lq_key, lqi, just_initialized)
    LQInstanceIsInitialized(LQKey, Arc<LQInstance>, bool)
}

pub struct LQGroup {
    inner: Mutex<LQGroupImpl>,

    pub lq_key: LQKey,
    messages_in_sender: FSender<LQGroup_InMsg>,
    messages_in_receiver: FReceiver<LQGroup_InMsg>,
    messages_out_sender: ABSender<LQGroup_OutMsg>,
    messages_out_receiver: ABReceiver<LQGroup_OutMsg>,
}
impl LQGroup {
    fn new(lq_key: LQKey, db_pool: DBPoolArc) -> Self {
        let (s1, r1): (FSender<LQGroup_InMsg>, FReceiver<LQGroup_InMsg>) = flume::unbounded();
        let (mut s2, r2): (ABSender<LQGroup_OutMsg>, ABReceiver<LQGroup_OutMsg>) = async_broadcast::broadcast(1000);

        // nothing ever "consumes" the messages in the `messages_out` channel, so we must enable overflow (ie. deletion of old entries once queue-size cap is reached)
        s2.set_overflow(true);

        //let lq_key = LQKey::new(table_name, filter);
        let new_self = Self {
            inner: Mutex::new(LQGroupImpl::new(lq_key.clone(), db_pool, s1.clone(), s2.clone())),

            lq_key,
            messages_in_sender: s1,
            messages_in_receiver: r1,
            messages_out_sender: s2,
            messages_out_receiver: r2,
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
    
    pub async fn get_initialized_lqi_for_key(&self, lq_key: &LQKey, force_queue_lqi: Option<Arc<LQInstance>>, mtx_p: Option<Mtx>) -> Arc<LQInstance> {
        let mut new_receiver = self.messages_out_receiver.new_receiver();
        self.send_message(LQGroup_InMsg::ScheduleLQIReadOrInitThenBroadcast(lq_key.clone(), force_queue_lqi, mtx_p));
        loop {
            #[allow(irrefutable_let_patterns)] // needed atm, since only one enum-option defined
            if let LQGroup_OutMsg::LQInstanceIsInitialized(lq_key2, lqi, _just_initialized) = new_receiver.recv().await.unwrap() && lq_key2 == *lq_key {
                return lqi;
            }
        }
    }
    pub async fn start_lq_watcher<'a, T: From<Row> + Serialize + DeserializeOwned>(&self, lq_key: &LQKey, stream_id: Uuid, mtx_p: Option<&Mtx>) -> (Vec<T>, LQEntryWatcher) {
        new_mtx!(mtx, "1:get or create lqi", mtx_p);
        /*new_mtx!(mtx2, "<proxy>", Some(&mtx));
        let lqi = self.get_initialized_lqi_for_key(&lq_key, Some(tx2)).await;*/
        let lqi = self.get_initialized_lqi_for_key(&lq_key, None, Some(mtx.proxy())).await;

        mtx.section("2:get current result-set");
        let result_entries = lqi.last_entries.read().await.clone();

        mtx.section("3:convert result-set to rust types");
        let result_entries_as_type: Vec<T> = json_maps_to_typed_entries(result_entries.clone());

        mtx.section("4:get or create watcher, for the given stream");
        //let watcher = entry.get_or_create_watcher(stream_id);
        let (watcher, _watcher_is_new, new_watcher_count) = lqi.get_or_create_watcher(stream_id, result_entries).await;
        let watcher_info_str = format!("@watcher_count_for_entry:{} @collection:{} @filter:{:?}", new_watcher_count, lq_key.table_name, lq_key.filter);
        debug!("LQ-watcher started. {}", watcher_info_str);

        (result_entries_as_type, watcher.clone())
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
        let live_queries: IndexMap<LQKey, Arc<LQInstance>> = self.inner.lock().await.get_lqis_committed_cloned(); // in cloning the IndexMap, all the keys and value are cloned as well

        for (lq_key, lqi) in live_queries.iter() {
            let entry_for_id = lqi.get_last_entry_with_id(entry_id).await;
            // if this lq-instance has no entries with the entry-id we want to refresh, then ignore it
            if entry_for_id.is_none() { continue; }
            
            //self.get_or_create_lq_instance_in_progressing_batch(lq_key, Some(lqi.clone()), None).await?;
            // first call retrieves the lqi (presumably from the commited-lqis list)
            //let lqi = self.get_initialized_lqi_for_key(lq_key, None, None).await;
            // this call forces the lqi to be re-queued in new/progressing batch
            self.get_initialized_lqi_for_key(lq_key, Some(lqi.clone()), None).await;

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
            };

            lqi.on_table_changed(&new_data_as_change, None).await;
        }
        Ok(())
    }
}