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
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use flume::{Sender, Receiver, unbounded};
use indexmap::IndexMap;
use itertools::Itertools;
use rust_shared::{time_since_epoch_ms, RwLock_Tracked};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map};
use tokio::sync::{mpsc, Mutex, RwLock};
use tokio::time::Instant;
use tokio_postgres::{Client, Row};
use tower::Service;
use tower_http::cors::{CorsLayer, Origin};
use async_graphql::futures_util::task::{Context, Poll};
use async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::body::{boxed, BoxBody, HttpBody};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, RequestParts, WebSocketUpgrade};
use axum::http::{self, Request, Response, StatusCode};
use axum::Error;
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, Stream, StreamExt, FutureExt};
use tracing::{info, warn, debug};
use uuid::Uuid;

use crate::store::live_queries_::lq_instance::get_lq_instance_key;
use crate::utils::db::filter::{entry_matches_filter, QueryFilter, FilterOp};
use crate::utils::db::handlers::json_maps_to_typed_entries;
use crate::utils::db::pg_stream_parsing::LDChange;
use crate::utils::db::queries::{get_entries_in_collection};
use crate::utils::general::extensions::ResultV;
use crate::utils::general::general::{AtomicF64};
use crate::utils::mtx::mtx::{Mtx, new_mtx};
use crate::utils::type_aliases::{JSONValue, PGClientObject, ABReceiver, ABSender};

use super::lq_batch::LQBatch;
use super::lq_instance::{LQInstance, LQEntryWatcher};

pub fn filter_shape_from_filter(filter: &QueryFilter) -> QueryFilter {
    let mut filter_shape = filter.clone();
    for (field_name, field_filter) in filter_shape.field_filters.clone().iter() {
        let field_filter_mut = filter_shape.field_filters.get_mut(field_name).unwrap();
        field_filter_mut.filter_ops = field_filter.filter_ops.clone().iter().map(|op| {
            let op_with_vals_stripped = match op {
                FilterOp::EqualsX(_val) => FilterOp::EqualsX(JSONValue::Null),
                FilterOp::IsWithinX(vals) => FilterOp::IsWithinX(vals.iter().map(|_| JSONValue::Null).collect_vec()),
                FilterOp::ContainsAllOfX(vals) => FilterOp::ContainsAllOfX(vals.iter().map(|_| JSONValue::Null).collect_vec()),
            };
            op_with_vals_stripped
        }).collect_vec();
    }
    filter_shape
}
pub fn get_lq_group_key(table_name: &str, filter: &QueryFilter) -> String {
    let filter_shape = filter_shape_from_filter(filter);
    json!({
        "table": table_name,
        "filter": filter_shape,
    }).to_string()
}

type RwLock_Std<T> = std::sync::RwLock<T>;

#[derive(Debug, Clone)]
pub enum LQBatchMessage {
    NotifyExecutionDone(usize),
}

#[derive(Clone)]
pub struct LQGroup_BatchesMeta {
    /*pub last_batch_buffering_started_index: AtomicI64,
    pub last_batch_execution_started_index: AtomicI64,
    pub last_batch_execution_started_time: AtomicF64,
    pub last_batch_executed_index: AtomicI64,
    pub last_batch_committed_index: AtomicI64,*/
    //pub last_batch_buffering_started_index: i64,
    pub last_batch_execution_started_index: i64,
    pub last_batch_execution_started_time: f64,
    //pub last_batch_executed_index: i64,
    pub last_batch_committed_index: i64,
}
impl LQGroup_BatchesMeta {
    pub fn new() -> Self {
        Self {
            /*last_batch_buffering_started_index: AtomicI64::new(0),
            last_batch_execution_started_index: AtomicI64::new(-1),
            last_batch_execution_started_time: AtomicF64::new(time_since_epoch_ms()),
            last_batch_executed_index: AtomicI64::new(-1),
            last_batch_committed_index: AtomicI64::new(-1),*/
            //last_batch_buffering_started_index: 0,
            last_batch_execution_started_index: -1,
            last_batch_execution_started_time: time_since_epoch_ms(),
            //last_batch_executed_index: -1,
            last_batch_committed_index: -1,
        }
    }
}

pub struct LQGroup {
    // shape
    pub table_name: String,
    pub filter_shape: QueryFilter,

    // for coordination of currently-buffering batches
    pub channel_for_batch_messages__sender_base: ABSender<LQBatchMessage>,
    pub channel_for_batch_messages__receiver_base: ABReceiver<LQBatchMessage>,
    
    pub batches: Vec<RwLock<LQBatch>>,
    pub batches_meta: RwLock<LQGroup_BatchesMeta>,

    /// Map of committed live-query instances.
    //pub query_instances: RwLock<IndexMap<String, Arc<LQInstance>>>,
    pub query_instances: RwLock_Tracked<IndexMap<String, Arc<LQInstance>>>,
    //source_sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>,
}
impl LQGroup {
    pub fn new(table_name: String, filter_shape: QueryFilter) -> Self {
        //let (s1, r1): (Sender<LQBatchMessage>, Receiver<LQBatchMessage>) = flume::unbounded();
        //let r1_clone = r1.clone(); // clone needed for tokio::spawn closure below
        let (s1, r1): (ABSender<LQBatchMessage>, ABReceiver<LQBatchMessage>) = async_broadcast::broadcast(10000); // temp-set to 10000, to fix deadlock (of some entries not being consumed I think)
        let new_self = Self {
            table_name: table_name.clone(),
            filter_shape: filter_shape.clone(),

            // for now, have the cycling-set contain 500 entries; this is enough to avoid lock-conflicts, while not hammering memory-usage
            batches: (0..500).map(|_| RwLock::new(LQBatch::new(table_name.clone(), filter_shape.clone()))).collect_vec(),
            batches_meta: RwLock::new(LQGroup_BatchesMeta::new()),

            channel_for_batch_messages__sender_base: s1,
            channel_for_batch_messages__receiver_base: r1,

            query_instances: RwLock_Tracked::new(IndexMap::new()),
            //source_sender_for_lq_watcher_drops: s1,
        };

        new_self
    }

    pub fn get_executing_batch(&self, meta: LQGroup_BatchesMeta) -> Option<(usize, &RwLock<LQBatch>)> {
        //let last_batch_execution_started_index = meta.last_batch_execution_started_index.load(Ordering::Relaxed);
        let last_batch_execution_started_index = meta.last_batch_execution_started_index;
        if last_batch_execution_started_index == -1 { return None; }

        //let last_batch_executed_index = self.last_batch_execution_started_index.load(Ordering::Relaxed);
        let last_batch_executed_index = meta.last_batch_execution_started_index;
        // if the "last started" and "last completed" differ, then there's still one (or more) in-progress
        if last_batch_execution_started_index != last_batch_executed_index {
            let index = last_batch_execution_started_index as usize;
            return Some((index, self.batches.get(index)?));
        }
        None
    }
    pub fn get_buffering_batch(&self, meta: LQGroup_BatchesMeta) -> (usize, &RwLock<LQBatch>) {
        //let index = self.batches.len() - 1;
        //let index = meta.last_batch_buffering_started_index as usize;
        let mut first_open_index = (meta.last_batch_execution_started_index + 1) as usize;
        if first_open_index > self.batches.len() - 1 {
            //println!("Looping around...");
            first_open_index = 0;
            /*let temp = self.batches.get(first_open_index).unwrap();
            let temp2 = temp.write().await;
            temp2.query_instances.drain(..);*/
        }
        let result = self.batches.get(first_open_index).unwrap();
        (first_open_index, result)
    }

    pub async fn start_lq_watcher<'a, T: From<Row> + Serialize + DeserializeOwned>(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid, ctx: PGClientObject, mtx_p: Option<&Mtx>) -> (Vec<T>, LQEntryWatcher) {
        new_mtx!(mtx, "1:get or create lqi", mtx_p);
        let (instance, lqi_active) = self.get_or_create_lq_instance(table_name, filter, ctx, Some(&mtx)).await;

        mtx.section("2:get current result-set");
        let result_entries = instance.last_entries.read().await.clone();

        mtx.section("3:convert result-set to rust types");
        let result_entries_as_type: Vec<T> = json_maps_to_typed_entries(result_entries);

        mtx.section("4:get or create watcher, for the given stream");
        //let watcher = entry.get_or_create_watcher(stream_id);
        let (watcher, _watcher_is_new, new_watcher_count) = instance.get_or_create_watcher(stream_id, Some(&mtx)).await;
        let watcher_info_str = format!("@watcher_count_for_this_lq_entry:{} @collection:{} @filter:{:?} @lqi_active:{}", new_watcher_count, table_name, filter, lqi_active);
        debug!("LQ-watcher started. {}", watcher_info_str);
        // atm, we do not expect more than 20 users online at the same time; so if there are more than 20 watchers of a single query, log a warning
        if new_watcher_count > 4 {
            warn!("WARNING: LQ-watcher count unusually high ({})! {}", new_watcher_count, watcher_info_str);
        }
        
        (result_entries_as_type, watcher.clone())
    }
    async fn get_or_create_lq_instance(&self, table_name: &str, filter: &QueryFilter, ctx: PGClientObject, parent_mtx: Option<&Mtx>) -> (Arc<LQInstance>, usize) {
        new_mtx!(mtx, "1:check if a new lqi is needed", parent_mtx);
        let lq_key = get_lq_instance_key(table_name, filter);

        let query_instances = self.query_instances.read("get_or_create_lq_instance").await;
        match query_instances.get(&lq_key) {
            Some(instance) => {
                mtx.section("2A:clone+return the current lqi for this key");
                (instance.clone(), query_instances.len())
            },
            None => {
                mtx.section("2B:create a new lqi");
                drop(query_instances); // must drop our read-lock, so that write-lock can be obtained, in func below
                self.create_new_lq_instance(table_name, filter, &lq_key, ctx, Some(&mtx)).await
            }
        }
    }
    async fn create_new_lq_instance(&self, table_name: &str, filter: &QueryFilter, lq_key: &str, ctx: PGClientObject, parent_mtx: Option<&Mtx>) -> (Arc<LQInstance>, usize) {
        new_mtx!(mtx, "1:add lqi to batch", parent_mtx);
        let (new_lqi_arc, batch_i, lqis_buffered_already) = {
            new_mtx!(mtx2, "1:get batches_meta read-lock", Some(&mtx));
            let meta_clone = self.batches_meta.read().await.clone();
            mtx2.section("2:get batch write-lock, and insert");
            let (batch_i, batch_lock) = self.get_buffering_batch(meta_clone);
            let mut batch = batch_lock.write().await;
            let instances_in_batch = &mut batch.query_instances;
            let lqis_buffered_already = instances_in_batch.len();

            let new_lqi = LQInstance::new(table_name.to_owned(), filter.clone(), vec![]);
            //live_queries.insert(lq_key.clone(), Arc::new(new_entry));
            let new_lqi_arc = Arc::new(new_lqi);
            instances_in_batch.insert(lq_key.to_owned(), new_lqi_arc.clone());

            (new_lqi_arc, batch_i, lqis_buffered_already)
        };

        let this_call_should_commit_batch = lqis_buffered_already == 0;
        mtx.section_2("2:wait for batch to execute", Some(format!("@lqis_buffered_already:{lqis_buffered_already} @will_trigger_execute:{this_call_should_commit_batch}")));
        self.execute_batch_x_once_ready(batch_i, ctx, this_call_should_commit_batch, Some(&mtx)).await;
        (new_lqi_arc, lqis_buffered_already)
    }
    async fn execute_batch_x_once_ready(&self, batch_i: usize, ctx: PGClientObject, this_call_triggers_execution: bool, parent_mtx: Option<&Mtx>) {
        // if this call is not the one to trigger execution, just wait for the execution to happen, then resume the caller-function
        if !this_call_triggers_execution {
            new_mtx!(_mtx, "1:wait for the batch to execute (it will be triggered by earlier call)", parent_mtx, Some(format!("@batch_i:{batch_i}")));
            //let sender_clone = self.channel_for_batch_messages__sender_base.clone();
            let mut receiver = self.channel_for_batch_messages__sender_base.new_receiver();
            loop {
                let msg = receiver.recv().await.unwrap();
                match msg {
                    LQBatchMessage::NotifyExecutionDone(executed_batch_i) => {
                        if executed_batch_i == batch_i {
                            break;
                        }
                    },
                }
            }
            return;
        }

        new_mtx!(mtx, "1:wait for the correct time to execute", parent_mtx, Some(format!("@batch_i:{batch_i}")));
        // todo: fine-tune these settings, as well as scale-up algorithm
        const LQ_BATCH_DURATION_MIN: f64 = 100f64;
        //const LQ_BATCH_DURATION_MAX: f64 = 100f64;
        let last_batch_execution_time = self.batches_meta.read().await.last_batch_execution_started_time;
        let batch_end_time = last_batch_execution_time + LQ_BATCH_DURATION_MIN;
        let time_till_batch_end = batch_end_time - time_since_epoch_ms();
        tokio::time::sleep(Duration::try_from_secs_f64(time_till_batch_end / 1000f64).unwrap_or(Duration::from_secs(0))).await;

        // now that we're done waiting, get write-locks right away
        mtx.section("2:acquire locks");
        new_mtx!(locks_mtx, "1:get batches-meta write-lock", Some(&mtx));
        let mut meta = self.batches_meta.write().await;
        locks_mtx.section("2:get batch write-lock");
        let (batch_i, batch_lock) = self.get_buffering_batch(meta.clone());
        let mut batch = batch_lock.write().await;
        drop(locks_mtx);

        mtx.section_2("3:execute the batch", Some(format!("@batch_lqi_count:{}", batch.query_instances.len())));
        meta.last_batch_execution_started_index = batch_i as i64;
        meta.last_batch_execution_started_time = time_since_epoch_ms();
        drop(meta); // drop lock on meta prior to executing batch
        batch.execute(ctx, Some(&mtx)).await.expect("Executing the lq-batch failed!");

        mtx.section("4:reacquire meta write-lock"); //, and update last_batch_executed_index
        // reacquire meta-lock
        let mut meta = self.batches_meta.write().await;
        //meta.last_batch_executed_index = batch_i as i64;

        mtx.section("5:reset batch, and drop batch write-lock");
        let instances_in_batch = batch.reset_for_next_cycle();
        let instances_in_batch_len = instances_in_batch.len();
        drop(batch); // drop write-lock on batch

        mtx.section_2("6:commit the lqi's in batch to overall group, and update batches-meta", Some(format!("@open-locks:{}", self.query_instances.get_live_guards_str())));
        {
            //let instances_in_batch = batch.query_instances.read().await;
            let mut query_instances = self.query_instances.write("execute_batch_x_once_ready").await;
            for (key, value) in instances_in_batch.into_iter() {
                query_instances.insert(key.to_owned(), value.clone());
            }
            mtx.current_section.extra_info = Some(format!("@group_lqi_count:{} @batch_lqi_count:{}", query_instances.len(), instances_in_batch_len));

            meta.last_batch_committed_index = batch_i as i64;
            //meta.last_batch_buffering_started_index = batch_i as i64;
        }

        mtx.section("7:send message notifying of execution being done");
        self.channel_for_batch_messages__sender_base.broadcast(LQBatchMessage::NotifyExecutionDone(batch_i)).await.unwrap();
    }

    /*pub fn get_sender_for_lq_watcher_drops(&self) -> Sender<DropLQWatcherMsg> {
        self.source_sender_for_lq_watcher_drops.clone()
    }*/
    pub async fn drop_lq_watcher(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid) {
        new_mtx!(mtx, "1:get query_instances write-lock");
        debug!("Got lq-watcher drop request. @table:{table_name} @filter:{filter} @stream_id:{stream_id}");

        let lq_key = get_lq_instance_key(table_name, filter);
        // break point
        let mut lq_instances = self.query_instances.write("drop_lq_watcher").await;
        mtx.section("2:get lq_instance for key, then get lq_instance.entry_watcher write-lock");
        let new_watcher_count = {
            let lq_instance = match lq_instances.get_mut(&lq_key) {
                Some(a) => a,
                None => return, // if entry already deleted, just ignore for now [maybe fixed after change to get_or_create_lq_instance?]
            };
            let mut entry_watchers = lq_instance.entry_watchers.write().await;
            
            mtx.section("3:update entry_watchers, then remove lq_instance (if no watchers), then complete");
            // commented the `.expect`, since was failing occasionally, and I don't have time to debug atm [maybe fixed after change to get_or_create_lq_instance?]
            //let _removed_value = entry_watchers.remove(&stream_id).expect(&format!("Trying to drop LQWatcher, but failed, since no entry was found with this key:{}", lq_key));
            entry_watchers.remove(&stream_id);
            
            entry_watchers.len()
        };
        if new_watcher_count == 0 {
            lq_instances.remove(&lq_key);
            debug!("Watcher count for live-query entry dropped to 0, so removing.");
        }

        debug!("LQ-watcher drop complete. @watcher_count_for_this_lq_entry:{} @lq_entry_count:{}", new_watcher_count, lq_instances.len());
    }
    
    pub async fn notify_of_ld_change(&self, change: &LDChange) {
        new_mtx!(mtx, "1:get query_instances read-lock");
        if self.table_name != change.table {
            return;
        }
        
        //let mut storage = storage_wrapper.write().await;
        /*let mut live_queries = self.query_instances.write().await;
        let mut1 = live_queries.iter_mut();
        for (lq_key, lq_info) in mut1 {*/
        let live_queries = self.query_instances.read("notify_of_ld_change").await;
        mtx.section("2:loop through lq-instances, and call on_table_changed");
        for (_lq_key, lq_instance) in live_queries.iter() {
            /*let lq_key_json: JSONValue = serde_json::from_str(lq_key).unwrap();
            if lq_key_json["table"].as_str().unwrap() != change.table { continue; }*/
            /*for (stream_id, change_listener) in lq_info.change_listeners.iter_mut() {
                change_listener(&lq_info.last_entries);
            }*/
            lq_instance.on_table_changed(&change, Some(&mtx)).await;
        }
    }
}