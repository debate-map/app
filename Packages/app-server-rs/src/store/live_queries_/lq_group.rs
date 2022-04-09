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
use std::sync::atomic::Ordering;
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
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map};
use tokio::sync::{broadcast, mpsc, Mutex, RwLock};
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
use uuid::Uuid;

use crate::store::live_queries_::lq_instance::get_lq_instance_key;
use crate::utils::db::filter::{entry_matches_filter, QueryFilter, FilterOp};
use crate::utils::db::handlers::json_maps_to_typed_entries;
use crate::utils::db::pg_stream_parsing::LDChange;
use crate::utils::db::queries::{get_entries_in_collection};
use crate::utils::general::extensions::ResultV;
use crate::utils::general::general::{AtomicF64, time_since_epoch_ms};
use crate::utils::mtx::mtx::{Mtx, new_mtx};
use crate::utils::type_aliases::{JSONValue, PGClientObject};

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

#[derive(Debug, Clone)]
pub enum LQBatchMessage {
    NotifyExecutionDone,
}
pub struct LQGroup {
    // shape
    pub table_name: String,
    pub filter_shape: QueryFilter,

    // for coordination of currently-buffering batches
    pub channel_for_batch_messages__sender_base: broadcast::Sender<LQBatchMessage>,
    pub channel_for_batch_messages__receiver_base: broadcast::Receiver<LQBatchMessage>,
    
    /// The last batch whose contents were committed. (to LQGroup.query_instances)
    pub last_committed_batch: RwLock<Option<LQBatch>>,
    /// The current-batch, ie. the next batch to be committed. (until it's committed, the lq-instances are not active)
    pub current_batch: RwLock<LQBatch>,
    pub current_batch_set_time: AtomicF64,

    /// Map of committed live-query instances.
    pub query_instances: RwLock<IndexMap<String, Arc<LQInstance>>>,
    //source_sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>,
}
impl LQGroup {
    pub fn new(table_name: String, filter_shape: QueryFilter) -> Self {
        //let (s1, r1): (Sender<LQBatchMessage>, Receiver<LQBatchMessage>) = flume::unbounded();
        //let r1_clone = r1.clone(); // clone needed for tokio::spawn closure below
        let (s1, r1): (broadcast::Sender<LQBatchMessage>, broadcast::Receiver<LQBatchMessage>) = broadcast::channel(10);
        let new_self = Self {
            table_name: table_name.clone(),
            filter_shape: filter_shape.clone(),

            last_committed_batch: RwLock::new(None),
            //next_batch: LQBatch::default(),
            current_batch: RwLock::new(LQBatch::new(table_name.clone(), filter_shape.clone())),
            current_batch_set_time: AtomicF64::new(time_since_epoch_ms()),

            channel_for_batch_messages__sender_base: s1,
            channel_for_batch_messages__receiver_base: r1,

            query_instances: RwLock::new(IndexMap::new()),
            //source_sender_for_lq_watcher_drops: s1,
        };

        // start this listener for batch requests
        /*tokio::spawn(async move {
            loop {
                let msg = r1_clone.recv_async().await.unwrap();
                match msg {
                    LQBatchMessage::Execute => {
                    },
                };
            }
        });*/

        new_self
    }

    pub async fn start_lq_watcher<'a, T: From<Row> + Serialize + DeserializeOwned>(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid, ctx: PGClientObject, mtx_p: Option<&Mtx>) -> (Vec<T>, LQEntryWatcher) {
        new_mtx!(mtx, "1:get or create lqi", mtx_p);
        let (instance, lqi_active) = self.get_or_create_lq_instance(table_name, filter, ctx, Some(&mtx)).await;

        mtx.section("2:get current result-set");
        let result_entries = {
            let result_entries = instance.last_entries.read().await;
            result_entries.clone()
        };

        mtx.section("3:convert result-set to rust types");
        let result_entries_as_type: Vec<T> = json_maps_to_typed_entries(result_entries);

        mtx.section("4:get or create watcher, for the given stream");
        //let watcher = entry.get_or_create_watcher(stream_id);
        let old_watcher_count = instance.entry_watchers.read().await.len();
        let (watcher, watcher_is_new) = instance.get_or_create_watcher(stream_id, mtx_p).await;
        let new_watcher_count = old_watcher_count + if watcher_is_new { 1 } else { 0 };
        let watcher_info_str = format!("@watcher_count_for_this_lq_entry:{} @collection:{} @filter:{:?} @lqi_active:{}", new_watcher_count, table_name, filter, lqi_active);
        println!("LQ-watcher started. {}", watcher_info_str);
        // atm, we do not expect more than 20 users online at the same time; so if there are more than 20 watchers of a single query, log a warning
        if new_watcher_count > 4 {
            println!("WARNING: LQ-watcher count unusually high ({})! {}", new_watcher_count, watcher_info_str);
        }
        
        (result_entries_as_type, watcher.clone())
    }
    async fn get_or_create_lq_instance(&self, table_name: &str, filter: &QueryFilter, ctx: PGClientObject, parent_mtx: Option<&Mtx>) -> (Arc<LQInstance>, usize) {
        new_mtx!(mtx, "1:check if a new lqi is needed", parent_mtx);
        let lq_key = get_lq_instance_key(table_name, filter);
        let creating_new_lqi = {
            let lq_instances = self.query_instances.read().await;
            let create_new_instance = !lq_instances.contains_key(&lq_key);
            create_new_instance
        };

        mtx.section("2:create a new lqi (if needed)");
        if creating_new_lqi {
            self.create_new_lq_instance(table_name, filter, &lq_key, ctx, Some(&mtx)).await;
        }

        mtx.section("3:return the current lqi for this key");
        let query_instances = self.query_instances.read().await;
        let instance = query_instances.get(&lq_key).unwrap();
        (instance.clone(), query_instances.len())
    }
    async fn create_new_lq_instance(&self, table_name: &str, filter: &QueryFilter, lq_key: &str, ctx: PGClientObject, parent_mtx: Option<&Mtx>) {
        new_mtx!(mtx, "1:add lqi to batch", parent_mtx);
        let old_lqi_count_in_batch = {
            //let batch = self.current_batch.read().await;
            let mut batch = self.current_batch.write().await;
            //let batch = self.current_batch.get_mut();
            //let mut instances_in_batch = batch.query_instances.write().await;
            let instances_in_batch = &mut batch.query_instances;
            let old_lqi_count_in_batch = instances_in_batch.len();

            let new_lqi = LQInstance::new(table_name.to_owned(), filter.clone(), vec![]);
            //live_queries.insert(lq_key.clone(), Arc::new(new_entry));
            instances_in_batch.insert(lq_key.to_owned(), Arc::new(new_lqi));

            old_lqi_count_in_batch
        };

        let this_call_should_commit_batch = old_lqi_count_in_batch == 0;
        mtx.section_2("2:wait for batch to execute", Some(format!("@old_lqi_count:{old_lqi_count_in_batch} @will_trigger_execute:{this_call_should_commit_batch}")));
        self.execute_current_batch_once_ready(ctx, this_call_should_commit_batch, Some(&mtx)).await;
    }
    async fn execute_current_batch_once_ready(&self, ctx: PGClientObject, this_call_triggers_execution: bool, parent_mtx: Option<&Mtx>) {
        // if this call is not the one to trigger execution, just wait for the execution to happen, then resume the caller-function
        if !this_call_triggers_execution {
            new_mtx!(_mtx, "1:wait for the batch to execute (it will be triggered by earlier call)", parent_mtx);
            //let sender_clone = self.channel_for_batch_messages__sender_base.clone();
            let mut receiver = self.channel_for_batch_messages__sender_base.subscribe();
            loop {
                let msg = receiver.recv().await.unwrap();
                match msg {
                    LQBatchMessage::NotifyExecutionDone => break,
                }
            }
            return;
        }

        new_mtx!(mtx, "1:wait for the correct time to execute", parent_mtx);
        // todo: fine-tune these settings, as well as scale-up algorithm
        const LQ_BATCH_DURATION_MIN: f64 = 100f64;
        //const LQ_BATCH_DURATION_MAX: f64 = 100f64;
        let current_batch_set_time = self.current_batch_set_time.load(Ordering::Relaxed);
        let batch_end_time = current_batch_set_time + LQ_BATCH_DURATION_MIN;
        let time_till_batch_end = batch_end_time - time_since_epoch_ms();
        tokio::time::sleep(Duration::try_from_secs_f64(time_till_batch_end / 1000f64).unwrap_or(Duration::from_secs(0))).await;

        // now that we're done waiting, get write-locks right away (else other calls of this function may add lqi's to the current-batch, which may get "missed" if this function progresses too far)
        mtx.section("2:acquire locks");
        new_mtx!(locks_mtx, "1:get current-batch write-lock", Some(&mtx));
        //let batch = self.current_batch.read().await;
        let mut batch = self.current_batch.write().await;
        //locks_mtx.section("2:get current-batch query_instances write-lock");
        //let instances_in_batch = batch.query_instances.write().await;
        locks_mtx.section("2:get last-committed-batch write-lock");
        let mut last_committed_batch_ref = self.last_committed_batch.write().await;
        drop(locks_mtx);

        mtx.section("3:execute the batch");
        batch.execute(ctx, Some(&mtx)).await.expect("Executing the lq-batch failed!");

        mtx.section("4:commit the lqi's in batch to overall group");
        {
            //let instances_in_batch = batch.query_instances.read().await;
            let instances_in_batch = &mut batch.query_instances;
            let mut query_instances = self.query_instances.write().await;
            mtx.current_section.extra_info = Some(format!("@lqi_count:{}", query_instances.len()));
            for (key, value) in instances_in_batch.iter() {
                query_instances.insert(key.to_owned(), value.clone());
            }
        }

        mtx.section("5:update the current-batch reference");
        let batch_committing_now = {
            // create a new batch as the next "current batch"
            let new_batch = LQBatch::new(self.table_name.clone(), self.filter_shape.clone());
            //let mut current_batch_ref = self.current_batch.write().await;
            let batch_committing_now = std::mem::replace(&mut *batch, new_batch);
            self.current_batch_set_time.store(time_since_epoch_ms(), Ordering::Relaxed);
            batch_committing_now
        };
        mtx.section("6:update the last-committed-batch reference");
        {
            //let mut last_committed_batch_ref = self.last_committed_batch.write().await;
            *last_committed_batch_ref = Some(batch_committing_now);
        }
        self.channel_for_batch_messages__sender_base.send(LQBatchMessage::NotifyExecutionDone).unwrap();
    }

    /*pub fn get_sender_for_lq_watcher_drops(&self) -> Sender<DropLQWatcherMsg> {
        self.source_sender_for_lq_watcher_drops.clone()
    }*/
    pub async fn drop_lq_watcher(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid) {
        println!("Got lq-watcher drop request. @table:{table_name} @filter:{filter} @stream_id:{stream_id}");

        let lq_key = get_lq_instance_key(table_name, filter);
        let mut live_queries = self.query_instances.write().await;
        let new_watcher_count = {
            let live_query = live_queries.get_mut(&lq_key).unwrap();
            let mut entry_watchers = live_query.entry_watchers.write().await;
            let _removed_value = entry_watchers.remove(&stream_id).expect(&format!("Trying to drop LQWatcher, but failed, since no entry was found with this key:{}", lq_key));
            
            entry_watchers.len()
        };
        if new_watcher_count == 0 {
            live_queries.remove(&lq_key);
            println!("Watcher count for live-query entry dropped to 0, so removing.");
        }

        println!("LQ-watcher drop complete. @watcher_count_for_this_lq_entry:{} @lq_entry_count:{}", new_watcher_count, live_queries.len());
    }
    
    pub async fn notify_of_ld_change(&self, change: &LDChange) {
        //let mut storage = storage_wrapper.write().await;
        /*let mut live_queries = self.query_instances.write().await;
        let mut1 = live_queries.iter_mut();
        for (lq_key, lq_info) in mut1 {*/
        let live_queries = self.query_instances.read().await;
        for (lq_key, lq_info) in live_queries.iter() {
            let lq_key_json: JSONValue = serde_json::from_str(lq_key).unwrap();
            if lq_key_json["table"].as_str().unwrap() != change.table { continue; }
            /*for (stream_id, change_listener) in lq_info.change_listeners.iter_mut() {
                change_listener(&lq_info.last_entries);
            }*/
            lq_info.on_table_changed(&change).await;
        }
    }
}