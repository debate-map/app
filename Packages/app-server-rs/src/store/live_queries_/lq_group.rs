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
use rust_shared::{futures, axum, tower, tower_http};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use flume::{Sender, Receiver, unbounded};
use indexmap::IndexMap;
use rust_shared::itertools::Itertools;
use rust_shared::utils::type_aliases::JSONValue;
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
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::uuid::Uuid;

use crate::links::monitor_backend_link::{MESSAGE_SENDER_TO_MONITOR_BACKEND, Message_ASToMB};
use crate::store::live_queries_::lq_instance::get_lq_instance_key;
use crate::utils::db::filter::{entry_matches_filter, QueryFilter, FilterOp};
use crate::utils::db::handlers::json_maps_to_typed_entries;
use crate::utils::db::pg_stream_parsing::{LDChange};
use crate::utils::type_aliases::RowData;
use crate::utils::db::queries::{get_entries_in_collection};
use crate::utils::general::general::{AtomicF64};
use crate::utils::mtx::mtx::{Mtx, new_mtx};
use crate::utils::type_aliases::{PGClientObject, ABReceiver, ABSender};

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
        // the size of this broadcast buffer should be at least as large as the number of batches (preferably with some extra room, in case of timing issues)
        let (mut s1, r1): (ABSender<LQBatchMessage>, ABReceiver<LQBatchMessage>) = async_broadcast::broadcast(1000);

        // afaik, the only case where overflow can (and has been) occuring is when there are no callers waiting for the batch to execute (in execute_batch_x_once_ready)
        // thus, it is fine to overflow/delete-old-entries, as no one cares about the entries in that case anyway
        s1.set_overflow(true);

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

    pub async fn start_lq_watcher<'a, T: From<Row> + Serialize + DeserializeOwned>(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid, client: &PGClientObject, mtx_p: Option<&Mtx>) -> (Vec<T>, LQEntryWatcher) {
        new_mtx!(mtx, "0:start loop", mtx_p);
        let result: (Vec<T>, LQEntryWatcher);
        // maybe temp; try to add lq-watcher on a loop, that we keep retrying until we succeed (workaround for some timing issues hit; there's almost certainly a better solution long-term)
        loop {
            mtx.section("1:get or create lqi");
            let (instance, lqi_active) = match self.get_or_create_lq_instance(table_name, filter, &client, Some(&mtx)).await {
                Ok(a) => a,
                // if we hit an error, retry in a bit
                Err(_err) => {
                    mtx.section("1.1:waiting a bit, before retrying");
                    time::sleep(Duration::from_millis(500)).await;
                    continue;
                }
            };

            mtx.section("2:get current result-set");
            let result_entries = instance.last_entries.read().await.clone();

            mtx.section("3:convert result-set to rust types");
            let result_entries_as_type: Vec<T> = json_maps_to_typed_entries(result_entries.clone());

            mtx.section("4:get or create watcher, for the given stream");
            //let watcher = entry.get_or_create_watcher(stream_id);
            let (watcher, _watcher_is_new, new_watcher_count) = instance.get_or_create_watcher(stream_id, Some(&mtx), result_entries).await;
            let watcher_info_str = format!("@watcher_count_for_entry:{} @collection:{} @filter:{:?} @lqi_active:{}", new_watcher_count, table_name, filter, lqi_active);
            debug!("LQ-watcher started. {}", watcher_info_str);
            // atm, we do not expect more than 20 users online at the same time; so if there are more than 20 watchers of a single query, log a warning
            if new_watcher_count > 4 {
                warn!("WARNING: LQ-watcher count unusually high ({})! {}", new_watcher_count, watcher_info_str);
            }
            
            result = (result_entries_as_type, watcher.clone());
            break;
        }

        result
    }

    async fn get_or_create_lq_instance(&self, table_name: &str, filter: &QueryFilter, client: &PGClientObject, parent_mtx: Option<&Mtx>) -> Result<(Arc<LQInstance>, usize), Error> {
        new_mtx!(mtx, "1:check if a new lqi is needed", parent_mtx);
        let lq_key = get_lq_instance_key(table_name, filter);

        let query_instances = self.query_instances.read("get_or_create_lq_instance").await;
        match query_instances.get(&lq_key) {
            Some(instance) => {
                mtx.section("2A:clone+return the current lqi for this key");
                Ok((instance.clone(), query_instances.len()))
            },
            None => {
                mtx.section("2B:create a new lqi");
                drop(query_instances); // must drop our read-lock, so that write-lock can be obtained, in func below
                Ok(self.create_new_lq_instance(table_name, filter, &lq_key, client, Some(&mtx)).await?)
            }
        }
    }
    async fn create_new_lq_instance(&self, table_name: &str, filter: &QueryFilter, lq_key: &str, client: &PGClientObject, parent_mtx: Option<&Mtx>) -> Result<(Arc<LQInstance>, usize), Error> {
        let entries = vec![];
        let new_lqi = LQInstance::new(table_name.to_owned(), filter.clone(), entries.clone());
        new_lqi.send_self_to_monitor_backend(entries, 0).await;

        //live_queries.insert(lq_key.clone(), Arc::new(new_entry));
        let new_lqi_arc = Arc::new(new_lqi);
        let lqis_buffered_already = self.schedule_lqi_init_within_batch(lq_key, new_lqi_arc.clone(), client, parent_mtx).await?;
        Ok((new_lqi_arc, lqis_buffered_already))
    }
    async fn schedule_lqi_init_within_batch(&self, lq_key: &str, new_lqi_arc: Arc<LQInstance>, client: &PGClientObject, parent_mtx: Option<&Mtx>) -> Result<usize, Error> {
        new_mtx!(mtx, "1:add lqi to batch", parent_mtx);
        let (batch_i, batch_generation, lqis_buffered_already) = {
            new_mtx!(mtx2, "1:get batches_meta read-lock", Some(&mtx));
            let meta_clone = self.batches_meta.read().await.clone();
            mtx2.section("2:get batch write-lock, and insert");
            let (batch_i, batch_lock) = self.get_buffering_batch(meta_clone);
            let mut batch = batch_lock.write().await;
            let batch_generation = batch.get_generation();
            let instances_in_batch = &mut batch.query_instances;
            let lqis_buffered_already = instances_in_batch.len();

            instances_in_batch.insert(lq_key.to_owned(), new_lqi_arc.clone());

            (batch_i, batch_generation, lqis_buffered_already)
        };

        let this_call_should_commit_batch = lqis_buffered_already == 0;
        mtx.section_2("2:wait for batch to execute", Some(format!("@lqis_buffered_already:{lqis_buffered_already} @will_trigger_execute:{this_call_should_commit_batch}")));
        self.execute_batch_x_once_ready(batch_i, batch_generation, client, Some(&mtx)).await?;
        Ok(lqis_buffered_already)
    }

    async fn execute_batch_x_once_ready(&self, batch_i: usize, batch_generation: usize, client: &PGClientObject, parent_mtx: Option<&Mtx>) -> Result<(), Error> {
        new_mtx!(mtx, "1:create receiver", parent_mtx, Some(format!("@batch_i:{batch_i} @batch_generation:{batch_generation}")));
        // create receiver now, so we start receiving all messages from this point
        let mut receiver = self.channel_for_batch_messages__sender_base.new_receiver();

        mtx.section("2:wait for the correct time to execute");
        // todo: fine-tune these settings, as well as scale-up algorithm
        const LQ_BATCH_DURATION_MIN: f64 = 100f64;
        //const LQ_BATCH_DURATION_MAX: f64 = 100f64;
        let last_batch_execution_time = self.batches_meta.read().await.last_batch_execution_started_time;
        let batch_end_time = last_batch_execution_time + LQ_BATCH_DURATION_MIN;
        let time_till_batch_end = batch_end_time - time_since_epoch_ms();
        tokio::time::sleep(Duration::try_from_secs_f64(time_till_batch_end / 1000f64).unwrap_or(Duration::from_secs(0))).await;

        mtx.section("3:race to be the one to perform the execution (it doesn't matter which succeeds)");
        {
            let batch_lock = self.batches.get(batch_i).unwrap();
            let mut batch = batch_lock.write().await;
            if batch.get_generation() == batch_generation {
                // upgrade to write lock; the first task that makes it here is the one that executes the batch
                //let batch = batch_lock.write().await;
                
                // now that we're done waiting, get write-locks right away
                new_mtx!(mtx2, "1:get batches-meta write-lock", Some(&mtx));
                let mut meta = self.batches_meta.write().await;

                mtx2.section_2("2:execute the batch", Some(format!("@batch_lqi_count:{}", batch.query_instances.len())));
                meta.last_batch_execution_started_index = batch_i as i64;
                meta.last_batch_execution_started_time = time_since_epoch_ms();
                drop(meta); // drop lock on meta prior to executing batch

                batch.execute(client, Some(&mtx2)).await.expect("Executing the lq-batch failed!");
                /*if let Err(err) = batch.execute(ctx, Some(&mtx)).await {
                    // if a query fails, log the error, but continue execution (better than panicking the whole server)
                    error!("{}", err);
                }*/

                mtx2.section("3:reacquire meta write-lock"); //, and update last_batch_executed_index
                // reacquire meta-lock
                let mut meta = self.batches_meta.write().await;
                //meta.last_batch_executed_index = batch_i as i64;

                mtx2.section("4:reset batch, and drop batch write-lock");
                let instances_in_batch = batch.mark_generation_end_and_reset();
                let instances_in_batch_len = instances_in_batch.len();
                drop(batch); // drop write-lock on batch

                mtx2.section_2("5:commit the lqi's in batch to overall group, and update batches-meta", Some(format!("@open-locks:{}", self.query_instances.get_live_guards_str())));
                {
                    //let instances_in_batch = batch.query_instances.read().await;
                    let mut query_instances = self.query_instances.write("execute_batch_x_once_ready").await;
                    for (key, value) in instances_in_batch.into_iter() {
                        let old_lqi = query_instances.insert(key.to_owned(), value.clone());
                        if let Some(old_lqi) = old_lqi {
                            // if an old-lqi was replaced, but in fact that "old lqi" was the same lqi...
                            if Arc::ptr_eq(&value.clone(), &old_lqi) {
                                // ...then this "recommit" is just due to a `refresh_lq_data_for_x` call (see function below) and is fine; do nothing
                            }
                            // else, the new-lqi is in fact a new instance/allocation (which means something went wrong; log an error)
                            else {
                                error!("After batch completed, lq-instance was being committed, but an earlier entry was found; this shouldn't happen. This is an error, since it means the prior lqi's watchers stop noticing changes!");
                                /*warn!("After batch completed, lq-instance was being committed, but an earlier entry was found; this shouldn't happen. Nonetheless, attempting to merge watchers...");
                                let new_lqi = query_instances.get(&key).ok_or(anyhow!("New-lqi not found!"))?;
                                let watchers = new_lqi.entry_watchers.write().await;
                                // an issue here is what stream-id to use (current code would leave dangling/unremovable watcher)
                                watchers.insert("TODO", LQEntryWatcher::new_proxy_to(old_lqi.entry_watchers));*/
                            }
                        }
                    }
                    mtx2.current_section.extra_info = Some(format!("@group_lqi_count:{} @batch_lqi_count:{}", query_instances.len(), instances_in_batch_len));

                    meta.last_batch_committed_index = batch_i as i64;
                    //meta.last_batch_buffering_started_index = batch_i as i64;
                }

                mtx2.section("6:send message notifying of execution being done");
                self.channel_for_batch_messages__sender_base.broadcast(LQBatchMessage::NotifyExecutionDone(batch_i)).await.unwrap();
            }
        }

        // todo: probably rework/remove this "confirmation" section (I think it's unnecessary now)
        mtx.section_2("4:loop through messages for confirmation that batch executed (performed by whoever won the race above)", Some(format!("@batch_i:{batch_i}")));
        //let sender_clone = self.channel_for_batch_messages__sender_base.clone();
        loop {
            let wait_for_execution_done = async {
                loop {
                    let msg = receiver.recv().await.unwrap();
                    match msg {
                        LQBatchMessage::NotifyExecutionDone(executed_batch_i) => {
                            if executed_batch_i == batch_i {
                                return;
                            }
                        },
                    }
                }
            };
            match time::timeout(Duration::from_secs(3), wait_for_execution_done).await {
                // temp: if we timeout after X seconds, having failed to receive the "batch execution done" message, assume we "missed" the batch-execution...
                Err(_err) => {
                    error!("Timed out waiting for confirmation of batch-execution completion. Retrying this request shortly... @table:{} @filter:{}", self.table_name, self.filter_shape);
                    // and so pass an error to parent (triggering a retry in a moment)
                    return Err(anyhow!("timed_out"));
                },
                // the "batch execution is done" message was received; break out of the message-reading loop
                Ok(_) => break,
            };
        }
        Ok(())
    }

    /*pub fn get_sender_for_lq_watcher_drops(&self) -> Sender<DropLQWatcherMsg> {
        self.source_sender_for_lq_watcher_drops.clone()
    }*/
    pub async fn drop_lq_watcher(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid) {
        new_mtx!(mtx, "1:get query_instances write-lock");
        debug!("Got lq-watcher drop request. @table:{table_name} @filter:{filter} @stream_id:{stream_id}");

        let lq_key = get_lq_instance_key(table_name, filter);
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

            // only send update for lqi if we're not about to be deleted
            if entry_watchers.len() > 0 {
                // todo: try to find a way to provide an up-to-date result_entries without getting a read-lock here (since wasn't necessary before sending-to-backend behavior)
                let current_entries = lq_instance.last_entries.read().await.clone();
                lq_instance.send_self_to_monitor_backend(current_entries, entry_watchers.len()).await;
            }
            
            entry_watchers.len()
        };
        if new_watcher_count == 0 {
            lq_instances.remove(&lq_key);
            debug!("Watcher count for live-query entry dropped to 0, so removing.");

            //let lq_key = get_lq_instance_key(&self.table_name, &self.filter);
            if let Err(err) = MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(Message_ASToMB::LQInstanceUpdated {
                table_name: table_name.to_owned(),
                filter: serde_json::to_value(filter.clone()).unwrap(),
                last_entries: vec![],
                watchers_count: 0u32,
                deleting: true,
            }).await {
                error!("Errored while broadcasting LQInstanceUpdated message. @error:{}", err);
            }
        }

        debug!("LQ-watcher drop complete. @watcher_count_for_entry:{} @lq_entry_count:{}", new_watcher_count, lq_instances.len());
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

    /// Reacquires the data for a given doc/row from the database, and force-updates the live-query entry for it.
    /// (temporary fix for bug where a `nodes/XXX` db-entry occasionally gets "stuck" -- ie. its live-query entry doesn't update, despite its db-data changing)
    pub async fn refresh_lq_data_for_x(&self, entry_id: &str, client: &PGClientObject) -> Result<(), Error> {
        /*new_mtx!(mtx, "1:get live_queries", None, Some(format!("@table_name:{} @entry_id:{}", self.table_name, entry_id)));
        mtx.log_call(None);*/

        // get read-lock for self.query_instances, clone the collection, then drop the lock immediately (to avoid deadlock with function-trees we're about to call)
        let live_queries: IndexMap<String, Arc<LQInstance>> = {
            let live_queries = self.query_instances.read("refresh_lq_data_for_x").await;
            live_queries.clone() // in cloning the IndexMap, all the keys and value are cloned as well
        };

        for (lq_key, lqi) in live_queries.iter() {
            let entry_for_id = lqi.get_last_entry_with_id(entry_id).await;
            // if this lq-instance has no entries with the entry-id we want to refresh, then ignore it
            if entry_for_id.is_none() { continue; }
            
            self.schedule_lqi_init_within_batch(lq_key, lqi.clone(), client, None).await?;
            let new_data = match lqi.get_last_entry_with_id(entry_id).await {
                None => {
                    warn!("While force-refreshing lq-data, the new batch completed, but no entry was found with the given id. This could mean the entry was just deleted, but more likely it's a bug.");
                    continue;
                },
                Some(a) => a,
            };
            info!("While force-refreshing lq-data, got new-data. @table:{} @new_data:{:?}", self.table_name, new_data);

            let new_data_as_change = LDChange {
                table: self.table_name.clone(),
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