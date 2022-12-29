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
use rust_shared::{futures, axum, tower, tower_http, check_lock_chain, LockChain, Lock, check_lock_chain2};
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
use rust_shared::anyhow::{anyhow, Error, bail, ensure};
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
    //pub batch_metas: Vec<BatchExecutionMeta>,

    pub last_batch_execution_started_index: i64,
    pub last_batch_execution_started_time: f64,
    //pub last_batch_executed_index: i64,
    pub last_batch_committed_index: i64,
}
impl LQGroup_BatchesMeta {
    pub fn new(/*batches_count: i64*/) -> Self {
        Self {
            last_batch_execution_started_index: -1,
            last_batch_execution_started_time: time_since_epoch_ms(),
            //last_batch_executed_index: -1,
            last_batch_committed_index: -1,
        }
    }

    /*pub fn batches_being_executed() -> Result<Vec<BatchExecutionMeta>, Error> {
        let mut batches_being_executed = vec![];
        for batch_meta in self.batch_metas.iter() {
            if batch_meta.execution_start_time > 0.0 && batch_meta.commit_time == 0.0 {
                batches_being_executed.push(batch_meta.clone());
            }
        }
        Ok(batches_being_executed)
    }*/
}

/*#[derive(Clone)]
pub struct BatchExecutionMeta {
    pub batch_index: i64,
    pub execution_start_time: f64,
    pub commit_time: Option<f64>,
}*/

#[derive(Clone)]
pub struct LQIAwaitingPopulationInfo {
    pub lqi: Arc<LQInstance>,
    pub batch_index: usize,
    pub batch_generation: usize,
    pub prior_lqis_in_batch: usize,
}

pub struct LQGroup {
    // shape
    pub table_name: String,
    pub filter_shape: QueryFilter,

    // for coordination of currently-buffering batches
    pub channel_for_batch_messages__sender_base: ABSender<LQBatchMessage>,
    pub channel_for_batch_messages__receiver_base: ABReceiver<LQBatchMessage>,
    
    pub batches: Vec<RwLock<LQBatch>>,
    pub batches_meta: RwLock_Tracked<LQGroup_BatchesMeta>,

    /// Map of live-query instances that are awaiting population.
    pub lqis_awaiting_population: RwLock_Tracked<IndexMap<String, LQIAwaitingPopulationInfo>>,

    /// Map of committed live-query instances.
    //pub query_instances: RwLock<IndexMap<String, Arc<LQInstance>>>,
    pub lqis_committed: RwLock_Tracked<IndexMap<String, Arc<LQInstance>>>,
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
            batches_meta: RwLock_Tracked::new(LQGroup_BatchesMeta::new(/*500*/)),

            channel_for_batch_messages__sender_base: s1,
            channel_for_batch_messages__receiver_base: r1,

            lqis_awaiting_population: RwLock_Tracked::new(IndexMap::new()),
            lqis_committed: RwLock_Tracked::new(IndexMap::new()),
            //source_sender_for_lq_watcher_drops: s1,
        };

        new_self
    }

    /*pub fn get_executing_batch(&self, meta: LQGroup_BatchesMeta) -> Option<(usize, &RwLock<LQBatch>)> {
        let last_batch_execution_started_index = meta.last_batch_execution_started_index;
        if last_batch_execution_started_index == -1 { return None; }

        let last_batch_executed_index = meta.last_batch_executed_index;
        // if the "last started" and "last completed" differ, then there's still one (or more) in-progress
        if last_batch_execution_started_index != last_batch_executed_index {
            let index = last_batch_execution_started_index as usize;
            return Some((index, self.batches.get(index)?));
        }
        None
    }*/
    pub fn get_buffering_batch(&self, meta: &LQGroup_BatchesMeta) -> (usize, &RwLock<LQBatch>) {
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
            let instance = match self.get_or_create_lq_instance(table_name, filter, &client, Some(&mtx)).await {
                Ok(a) => a,
                // if we hit an error, retry in a bit
                Err(err) => {
                    error!("Hit error during attempt to get or create lqi, probably due to multi-threading contention. Retrying in a bit. Error: {}", err);
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
            let watcher_info_str = format!("@watcher_count_for_entry:{} @collection:{} @filter:{:?}", new_watcher_count, table_name, filter);
            debug!("LQ-watcher started. {}", watcher_info_str);
            // atm, we do not expect more than 20 users online at the same time; so if there are more than 20 watchers of a single query, log a warning
            // commented; clutters logs too much; could rate-limit these warnings, but better to just improve monitor-tool's introspection of the live-query system
            /*if new_watcher_count > 4 {
                warn!("WARNING: LQ-watcher count unusually high ({})! {}", new_watcher_count, watcher_info_str);
            }*/
            
            result = (result_entries_as_type, watcher.clone());
            break;
        }

        result
    }

    async fn get_or_create_lq_instance(&self, table_name: &str, filter: &QueryFilter, client: &PGClientObject, parent_mtx: Option<&Mtx>) -> Result<Arc<LQInstance>, Error> {
        new_mtx!(mtx, "1:check if a new lqi is needed", parent_mtx);
        let lq_key = get_lq_instance_key(table_name, filter);

        mtx.section("2:try to find lqi in lq-group's committed lqi's");
        if let Some(lqi) = self.get_lq_instance_if_committed(&lq_key).await {
            return Ok(lqi);
        }

        mtx.section("3:find lqi in an executing/buffering batch, or create it in the buffering-batch; then wait for its population as part of the batch");
        let lqi = self.get_or_create_lq_instance_in_progressing_batch(table_name, filter, &lq_key, client, None, Some(&mtx)).await?;
        Ok(lqi)
    }
    async fn get_lq_instance_if_committed(&self, lq_key: &str) -> Option<Arc<LQInstance>> {
        let query_instances = self.lqis_committed.read("get_lq_instance_if_committed").await;
        let instance = query_instances.get(lq_key);
        instance.map(|a| a.clone())
    }

    /// Finds the lq-instance for the given lq-key in an executing or buffering batch, or if absent, creates an lq-instance for it in the buffering-batch;
    /// then waits for its data to be populated, and for it to be committed into `LQGroup.query_instances`.
    async fn get_or_create_lq_instance_in_progressing_batch(&self, table_name: &str, filter: &QueryFilter, lq_key: &str, client: &PGClientObject, force_add_lqi: Option<Arc<LQInstance>>, parent_mtx: Option<&Mtx>) -> Result<Arc<LQInstance>, Error> {
        new_mtx!(mtx, "1:find lqi in an executing/buffering batch, or create new lqi in the buffering-batch", parent_mtx);
        let (batch_index, batch_generation, prior_lqis_in_batch, lqi_in_batch, _lqi_inserted, receiver) = 'getter_block: {
            mtx.section("2:get batches_meta read-lock, clone, then drop lock");
            let meta_clone = self.batches_meta.read("get_or_create_lq_instance_in_progressing_batch").await.clone();

            /*let lqis_awaiting_population = {
                //check_lock_chain!({Lock::LQGroup_batches_meta}, {Lock::LQGroup_lqis_awaiting_population});
                self.lqis_awaiting_population.read("get_or_create_lq_instance_in_progressing_batch").await.clone()
            };*/
            let lqis_awaiting_population = self.lqis_awaiting_population.read("get_or_create_lq_instance_in_progressing_batch").await;

            // create receiver now, so we start receiving all messages from this point
            let receiver = self.channel_for_batch_messages__sender_base.new_receiver();

            mtx.section("3:find/create lqi in relevant batch");
            // if this lq_key is already added to a batch, and awaiting population, simply find the relevant lq-instance in that batch and return it
            if let Some(entry) = lqis_awaiting_population.get(lq_key) && force_add_lqi.is_none() {
                //mtx2.section("3:get the actual lqi out of the batch, and return it");
                /*let batch_lock = self.batches.get(entry.batch_index).unwrap();
                let batch = batch_lock.read().await;

                let lqis_awaiting_population = {
                    check_lock_chain2::<{Lock::LQGroup_batches_x}, {Lock::LQGroup_lqis_awaiting_population}>();
                    self.lqis_awaiting_population.read("get_or_create_lq_instance_in_progressing_batch").await.clone()
                };
                ensure!(batch.get_generation() == entry.batch_generation, "LQI is marked as awaiting-population, but the specified batch has already finished executing! lq_key still marked as awaiting pop?:{}", lqis_awaiting_population.get(lq_key).is_some());*/

                (entry.batch_index, entry.batch_generation, entry.prior_lqis_in_batch, entry.lqi.clone(), false, receiver)
            }
            // else, create a new lq-instance for this lq-key, and add it to the buffering-batch
            else {
                mtx.section("2:get batch write-lock, and insert");
                let (batch_index, batch_lock) = self.get_buffering_batch(&meta_clone);

                //check_lock_chain2::<{Lock::LQGroup_lqis_awaiting_population}, {Lock::LQGroup_batches_x}>();
                drop(lqis_awaiting_population);
                let mut batch = batch_lock.write().await;
                let batch_gen = batch.get_generation();
                
                let lqis_in_batch = &mut batch.query_instances;
                let prior_lqis_in_batch = lqis_in_batch.len();

                let lqi = match force_add_lqi {
                    Some(passed_lqi_arc) => {
                        lqis_in_batch.insert(lq_key.to_owned(), passed_lqi_arc.clone());
                        passed_lqi_arc
                    },
                    None => {
                        if let Some(lqi_arc) = lqis_in_batch.get(lq_key) {
                            warn!("The buffering batch contains an entry for this lq-key; this case would ideally be handled by the `lq_keys_awaiting_population` check above, but can miss if lqis_awaiting_population was changed between the drop(lqis_awaiting_population) above and this line; handling, by using the already-added-to-buffering-batch lqi.");
                            break 'getter_block (batch_index, batch_gen, prior_lqis_in_batch, lqi_arc.clone(), false, receiver);
                        }

                        let entries = vec![];
                        let new_lqi = LQInstance::new(table_name.to_owned(), filter.clone(), entries.clone());

                        // let monitor-tool know about this lq-instance, even prior to its being populated with data or "committed" to the lq-group
                        new_lqi.send_self_to_monitor_backend(entries, 0).await;
                        // commented; not sure if this is needed (don't prematurely optimize)
                        /*let message = new_lqi.get_lq_instance_updated_message(entries, 0);
                        tokio::spawn(async {
                            if let Err(err) = MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(message).await {
                                error!("Errored while broadcasting LQInstanceUpdated message. @error:{}", err);
                            }
                        });*/
                        
                        let new_lqi_arc = Arc::new(new_lqi);
                        lqis_in_batch.insert(lq_key.to_owned(), new_lqi_arc.clone());
                        //meta.lq_keys_awaiting_population.push((lq_key.to_owned(), batch_index));
                        new_lqi_arc
                    }
                };

                // This may result in a race; will try moving.
                /*if lqi_inserted*/ {
                    mtx.section("4:insert lqi and such into lqis_awaiting_population");
                    check_lock_chain2::<{Lock::LQGroup_batches_x}, {Lock::LQGroup_lqis_awaiting_population}>();
                    let mut lq_keys_awaiting_population = self.lqis_awaiting_population.write("get_or_create_lq_instance_in_progressing_batch").await;
                    lq_keys_awaiting_population.insert(lq_key.to_owned(), LQIAwaitingPopulationInfo {
                        batch_index,
                        batch_generation: batch.get_generation(),
                        prior_lqis_in_batch,
                        lqi: lqi.clone(),
                    });
                }

                (batch_index, batch.get_generation(), prior_lqis_in_batch, lqi, true, receiver)
            }
        };

        mtx.section_2("3:wait for batch to execute", Some(format!("@prior_lqis_in_batch:{prior_lqis_in_batch}")));
        self.execute_batch_x_once_ready(batch_index, batch_generation, client, Some(&mtx), receiver).await?;
        Ok(lqi_in_batch)
    }

    async fn execute_batch_x_once_ready(&self, batch_i: usize, batch_generation: usize, client: &PGClientObject, parent_mtx: Option<&Mtx>, receiver: ABReceiver<LQBatchMessage>) -> Result<(), Error> {
        new_mtx!(mtx, "1:create receiver", parent_mtx, Some(format!("@batch_i:{batch_i} @batch_generation:{batch_generation}")));
        // create receiver now, so we start receiving all messages from this point
        //let receiver = self.channel_for_batch_messages__sender_base.new_receiver();

        mtx.section("2:wait for the correct time to execute");
        // todo: fine-tune these settings, as well as scale-up algorithm
        const LQ_BATCH_DURATION_MIN: f64 = 100f64;
        //const LQ_BATCH_DURATION_MAX: f64 = 100f64;
        let last_batch_execution_time = self.batches_meta.read("execute_batch_x_once_ready").await.last_batch_execution_started_time;
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
                //check_lock_chain!({Lock::LQGroup_batches_x}, {Lock::LQGroup_batches_meta});
                check_lock_chain2::<{Lock::LQGroup_batches_x}, {Lock::LQGroup_batches_meta}>();
                let mut meta = self.batches_meta.write("execute_batch_x_once_ready").await;

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
                //check_lock_chain!({Lock::LQGroup_batches_x}, {Lock::LQGroup_batches_meta});
                check_lock_chain2::<{Lock::LQGroup_batches_x}, {Lock::LQGroup_batches_meta}>();
                let mut meta = self.batches_meta.write("execute_batch_x_once_ready").await;
                //meta.last_batch_executed_index = batch_i as i64;

                mtx2.section("4:reset batch, and drop batch write-lock");
                let instances_in_batch = batch.mark_generation_end_and_reset();
                let instances_in_batch_len = instances_in_batch.len();
                let instances_in_batch_lq_keys = instances_in_batch.iter().map(|a| &a.0).cloned().collect_vec();
                drop(batch); // drop write-lock on batch
                
                mtx2.section_2("5:commit the lqi's in batch to overall group, and update batches-meta", Some(format!("@open-locks:{}", self.lqis_committed.get_live_guards_str())));
                {
                    // Acquire lock on lq_keys_awaiting_population first; this way, code in `get_or_create_lq_instance_in_progressing_batch` knows that as long as it holds a read-lock:
                    // 1) It is safe to create the receiver that is then used to wait for the batch's execution. (ie. we have not yet broadcast the `LQBatchMessage::NotifyExecutionDone` message)
                    // 2) It is safe to...
                    check_lock_chain2::<{Lock::LQGroup_batches_meta}, {Lock::LQGroup_lqis_awaiting_population}>();
                    let mut lq_keys_awaiting_population = self.lqis_awaiting_population.write("execute_batch_x_once_ready").await;
                    
                    //let instances_in_batch = batch.query_instances.read().await;
                    //check_lock_chain!({Lock::LQGroup_batches_x}, {Lock::LQGroup_batches_meta}, {Lock::LQGroup_lqis_committed});
                    check_lock_chain2::<{Lock::LQGroup_lqis_awaiting_population}, {Lock::LQGroup_lqis_committed}>();
                    let mut query_instances = self.lqis_committed.write("execute_batch_x_once_ready").await;
                    for (key, value) in instances_in_batch.into_iter() {
                        // this check may be needed, for case of race condition (where lqi-initialization is started for the same lq-key, in two batches; this check stops the "2nd batch" from overwriting the "1st batch's" lqi) 
                        /*if query_instances.contains_key(&key) {
                            bail!("An entry for this lq_key already exists in lq-group! Returning error, so that `get_or_create_lq_instance` reruns, this time finding the new entry. @lq_key:{:?} @batch_i:{:?} @batch_generation:{:?}",
                                &key, batch_i, batch_generation);
                        }*/

                        let old_lqi = query_instances.insert(key.to_owned(), value.clone());
                        if let Some(old_lqi) = old_lqi {
                            // if an old-lqi was replaced, but in fact that "old lqi" was the same lqi...
                            if Arc::ptr_eq(&value.clone(), &old_lqi) {
                                // ...then this "recommit" is just due to a `refresh_lq_data_for_x` call (see function below) and is fine; do nothing
                            }
                            // else, the new-lqi is in fact a new instance/allocation (which means we need to merge the old-lqi into the new-lqi)
                            else {
                                //error!("After batch completed, lq-instance was being committed, but an earlier entry was found; this shouldn't happen. This is an error, since it means the prior lqi's watchers stop noticing changes!");
                                
                                // drain the old-watchers vector; this way watchers will only be getting updates from the new-lqi
                                let old_watchers: Vec<(Uuid, LQEntryWatcher)> = {
                                    let mut old_watchers = old_lqi.entry_watchers.write().await;
                                    old_watchers.drain().collect_vec()
                                };
                                let old_watchers_count = old_watchers.len();

                                let latest_entries = {
                                    //check_lock_chain!({Lock::LQGroup_batches_x}, {Lock::LQGroup_batches_meta}, {Lock::LQGroup_lqis_committed}, {Lock::LQInstance_last_entries});
                                    check_lock_chain2::<{Lock::LQGroup_lqis_committed}, {Lock::LQInstance_last_entries}>();
                                    value.last_entries.read().await.clone()
                                };

                                let new_lqi = query_instances.get(&key).ok_or(anyhow!("New-lqi not found!"))?;
                                //check_lock_chain!({Lock::LQGroup_batches_x}, {Lock::LQGroup_batches_meta}, {Lock::LQGroup_lqis_committed}, {Lock::LQInstance_entry_watchers});
                                check_lock_chain2::<{Lock::LQGroup_lqis_committed}, {Lock::LQInstance_entry_watchers}>();
                                let mut new_watchers = new_lqi.entry_watchers.write().await;
                                for (old_stream_id, old_watcher) in old_watchers {
                                    // since lqi that old-watcher was attached to might have had a not-yet-updated entries-set, send each watcher the latest entries-set
                                    old_watcher.new_entries_channel_sender.send(latest_entries.clone()).unwrap();

                                    new_watchers.insert(old_stream_id, old_watcher);
                                }

                                // commented; not needed, since a call to this will occur soon back up in the `start_lq_watcher` function (through its call to `get_or_create_watcher`)
                                //new_lqi.send_self_to_monitor_backend(new_entries, entry_watchers.len()).await;

                                error!("After batch completed, lq-instance was being committed, but an earlier entry was found; this should never happen. Nonetheless, as defensive programming, attempting to resolve by merging the watchers... {}",
                                    format!("@batch_i:{} @batch_gen:{} @old_count:{} @new_count:{} @final_count:{}", batch_i, batch_generation, old_watchers_count, new_watchers.len() - old_watchers_count, new_watchers.len()));
                            }
                        }
                        //ensure!(old_lqi.is_none());
                    }
                    mtx2.current_section.extra_info = Some(format!("@group_lqi_count:{} @batch_lqi_count:{}", query_instances.len(), instances_in_batch_len));

                    // now that we've "committed" this batch's lqi's to the lq-group, remove their lq-keys from the `lq_keys_awaiting_population` list
                    {
                        //check_lock_chain!({Lock::LQGroup_batches_x}, {Lock::LQGroup_batches_meta}, {Lock::LQGroup_lqis_committed}, {Lock::LQGroup_lqis_awaiting_population});
                        /*check_lock_chain2::<{Lock::LQGroup_lqis_committed}, {Lock::LQGroup_lqis_awaiting_population}>();
                        let mut lq_keys_awaiting_population = self.lqis_awaiting_population.write("execute_batch_x_once_ready").await;*/
                        for lq_key in instances_in_batch_lq_keys {
                            lq_keys_awaiting_population.remove(&lq_key);
                        }
                    }

                    meta.last_batch_committed_index = batch_i as i64;
                    //meta.last_batch_buffering_started_index = batch_i as i64;
                }

                mtx2.section("6:send message notifying of execution being done");
                self.channel_for_batch_messages__sender_base.broadcast(LQBatchMessage::NotifyExecutionDone(batch_i)).await.unwrap();
            }
        }

        // this "wait for batch completion" loop might seem unnecessary, but it remains necessary, in case the call that "won the race" ended up erroring during the batch execution
        mtx.section_2("4:loop through messages for confirmation that batch executed (performed by whoever won the race above)", Some(format!("@batch_i:{batch_i}")));
        //let sender_clone = self.channel_for_batch_messages__sender_base.clone();
        self.wait_for_batch_to_complete(batch_i, 3, receiver).await?;

        Ok(())
    }

    /// If the caller function itself is a potential "completer" of the batch, then the `receiver` it provides to this function must be
    /// created (using `self.channel_for_batch_messages__sender_base.new_receiver()`) *prior* to sending of the "batch completed" message.
    async fn wait_for_batch_to_complete(&self, batch_i: usize, timeout_secs: u64, mut receiver: ABReceiver<LQBatchMessage>) -> Result<(), Error> {
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
            match time::timeout(Duration::from_secs(timeout_secs), wait_for_execution_done).await {
                // temp: if we timeout after X seconds, having failed to receive the "batch execution done" message, assume we "missed" the batch-execution...
                Err(_err) => {
                    error!("Timed out waiting for confirmation of batch-execution completion. Retrying this request shortly... @table:{} @filter_shape:{}", self.table_name, self.filter_shape);
                    // and so pass an error to parent (triggering a retry in a moment)
                    return Err(anyhow!("timed_out"));
                },
                // the "batch execution is done" message was received; break out of the message-reading loop
                Ok(_) => return Ok(()),
            };
        }
    }

    /*pub fn get_sender_for_lq_watcher_drops(&self) -> Sender<DropLQWatcherMsg> {
        self.source_sender_for_lq_watcher_drops.clone()
    }*/
    pub async fn drop_lq_watcher(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid) {
        new_mtx!(mtx, "1:get query_instances write-lock");
        debug!("Got lq-watcher drop request. @table:{table_name} @filter:{filter} @stream_id:{stream_id}");

        let lq_key = get_lq_instance_key(table_name, filter);
        let mut lq_instances = self.lqis_committed.write("drop_lq_watcher").await;
        mtx.section("2:get lq_instance for key, then get lq_instance.entry_watcher write-lock");
        let new_watcher_count = {
            let lq_instance = match lq_instances.get_mut(&lq_key) {
                Some(a) => a,
                None => return, // if entry already deleted, just ignore for now [maybe fixed after change to get_or_create_lq_instance?]
            };
            //check_lock_chain!({Lock::LQGroup_lqis_committed}, {Lock::LQInstance_entry_watchers});
            check_lock_chain2::<{Lock::LQGroup_lqis_committed}, {Lock::LQInstance_entry_watchers}>();
            let mut entry_watchers = lq_instance.entry_watchers.write().await;
            
            mtx.section("3:update entry_watchers, then remove lq_instance (if no watchers), then complete");
            // commented the `.expect`, since was failing occasionally, and I don't have time to debug atm [maybe fixed after change to get_or_create_lq_instance?]
            //let _removed_value = entry_watchers.remove(&stream_id).expect(&format!("Trying to drop LQWatcher, but failed, since no entry was found with this key:{}", lq_key));
            entry_watchers.remove(&stream_id);

            // only send update for lqi if we're not about to be deleted
            if entry_watchers.len() > 0 {
                // todo: try to find a way to provide an up-to-date result_entries without getting a read-lock here (since wasn't necessary before sending-to-backend behavior)
                //check_lock_chain!({Lock::LQGroup_lqis_committed}, {Lock::LQInstance_entry_watchers}, {Lock::LQInstance_last_entries});
                check_lock_chain2::<{Lock::LQInstance_entry_watchers}, {Lock::LQInstance_last_entries}>();
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
        let live_queries = self.lqis_committed.read("notify_of_ld_change").await;
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
            let live_queries = self.lqis_committed.read("refresh_lq_data_for_x").await;
            live_queries.clone() // in cloning the IndexMap, all the keys and value are cloned as well
        };

        for (lq_key, lqi) in live_queries.iter() {
            let entry_for_id = lqi.get_last_entry_with_id(entry_id).await;
            // if this lq-instance has no entries with the entry-id we want to refresh, then ignore it
            if entry_for_id.is_none() { continue; }
            
            self.get_or_create_lq_instance_in_progressing_batch(&self.table_name, &lqi.filter, lq_key, client, Some(lqi.clone()), None).await?;
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