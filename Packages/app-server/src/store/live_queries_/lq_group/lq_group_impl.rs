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
use rust_shared::links::app_server_to_monitor_backend::Message_ASToMB;
use rust_shared::utils::mtx::mtx::Mtx;
use rust_shared::{futures, axum, tower, tower_http, Lock, check_lock_order, new_mtx};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, Router};
use rust_shared::flume::{Sender, Receiver, unbounded};
use rust_shared::indexmap::IndexMap;
use rust_shared::itertools::Itertools;
use rust_shared::utils::type_aliases::{JSONValue, FSender};
use rust_shared::{utils::time::time_since_epoch_ms, RwLock_Tracked, tokio, serde_json};
use rust_shared::serde::de::DeserializeOwned;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Map};
use rust_shared::tokio::sync::{mpsc, Mutex, RwLock};
use rust_shared::tokio::time::{Instant, self};
use rust_shared::tokio_postgres::{Client, Row};
use tower::Service;
use tower_http::cors::{CorsLayer};
use rust_shared::async_graphql::futures_util::task::{Context, Poll};
use rust_shared::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, WebSocketUpgrade};
use axum::http::{self, Request, Response, StatusCode};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, Stream, StreamExt, FutureExt};
use tracing::{info, warn, debug, error};
use rust_shared::anyhow::{anyhow, Error, bail, ensure};
use rust_shared::uuid::Uuid;

use crate::links::monitor_backend_link::MESSAGE_SENDER_TO_MONITOR_BACKEND;
use crate::store::live_queries_::lq_group::lq_group::LQGroup_OutMsg;
use crate::store::live_queries_::lq_key::{filter_shape_from_filter, LQKey};
use crate::store::storage::AppStateArc;
use crate::utils::db::filter::{entry_matches_filter, QueryFilter, FilterOp};
use crate::utils::db::pg_stream_parsing::{LDChange};
use crate::utils::db::queries::{get_entries_in_collection};
use crate::utils::general::general::{AtomicF64};
use crate::utils::type_aliases::{PGClientObject, ABReceiver, ABSender, DBPoolArc};

use super::super::lq_instance::{LQInstance, LQEntryWatcher};
use super::lq_batch::lq_batch::LQBatch;
use super::lq_group::LQGroup_InMsg;

pub fn get_lq_group_key(table_name: &str, filter: &QueryFilter) -> String {
    let filter_shape = filter_shape_from_filter(filter);
    json!({
        "table": table_name,
        "filter": filter_shape,
    }).to_string()
}

#[derive(Debug, Clone)]
pub enum LQBatchMessage {
    NotifyExecutionDone(usize),
}

#[derive(Clone)]
pub(super) struct LQGroup_BatchesMeta {
    last_batch_execution_started_index: i64,
    last_batch_execution_started_time: f64,
    last_batch_committed_index: i64,

    /// Map of live-query instances that are awaiting population.
    lqis_awaiting_population: IndexMap<LQKey, LQIAwaitingPopulationInfo>,
    
    /// Map of committed live-query instances.
    lqis_committed: IndexMap<LQKey, Arc<LQInstance>>,
}
impl LQGroup_BatchesMeta {
    fn new(/*batches_count: i64*/) -> Self {
        Self {
            last_batch_execution_started_index: -1,
            last_batch_execution_started_time: time_since_epoch_ms(),
            //last_batch_executed_index: -1,
            last_batch_committed_index: -1,
            lqis_awaiting_population: IndexMap::new(),
            lqis_committed: IndexMap::new(),
        }
    }
}

#[derive(Clone)]
struct LQIAwaitingPopulationInfo {
    lqi: Arc<LQInstance>,
    batch_index: usize,
    batch_generation: usize,
    prior_lqis_in_batch: usize,
}

// sync docs with LQGroup
/// A "live query group" is essentially a set of live-queries that all have the same "generic signature" (ie. table + filter operations with value slots), but which have different values assigned to each slot.
/// The `LQGroup` struct is the "public interface" for the lq-group. Its methods are mostly async, with each "sending a message" to the "inner" `LQGroupImpl` struct, which queues up a set of calls and then processes them as a batch.
/// When the batched processing in the `LQGroupImpl` completes, it sends a message back to the "waiting" `LQGroup`s, which then are able to have their async methods return.
pub(super) struct LQGroupImpl {
    // shape
    lq_key: LQKey,

    db_pool: DBPoolArc,

    // for coordination of currently-buffering batches
    channel_for_batch_messages__sender_base: ABSender<LQBatchMessage>,
    channel_for_batch_messages__receiver_base: ABReceiver<LQBatchMessage>,
    
    batches: Vec<Arc<RwLock<LQBatch>>>,
    meta: LQGroup_BatchesMeta,

    //source_sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>,

    messages_in_sender: FSender<LQGroup_InMsg>,
    messages_out_sender: ABSender<LQGroup_OutMsg>,
    /// Stores a list of the debug-strings for messages that have been read/processed (through messages_in), as well as sent (through messages_out), in order of that processing/sending.
    processed_or_sent_messages: Vec<String>,
}
impl LQGroupImpl {
    pub(super) fn new(lq_key: LQKey, db_pool: DBPoolArc, messages_in_sender: FSender<LQGroup_InMsg>, messages_out_sender: ABSender<LQGroup_OutMsg>) -> Self {
        // the size of this broadcast buffer should be at least as large as the number of batches (preferably with some extra room, in case of timing issues)
        let (mut s1, r1): (ABSender<LQBatchMessage>, ABReceiver<LQBatchMessage>) = async_broadcast::broadcast(1000);

        // afaik, the only case where overflow can (and has been) occuring is when there are no callers waiting for the batch to execute (in execute_batch_x_once_ready)
        // thus, it is fine to overflow/delete-old-entries, as no one cares about the entries in that case anyway
        s1.set_overflow(true);

        let new_self = Self {
            lq_key: lq_key.clone(),

            db_pool,

            // for now, have the cycling-set contain 500 entries; this is enough to avoid lock-conflicts, while not hammering memory-usage
            batches: (0..500).map(|_| Arc::new(RwLock::new(LQBatch::new(lq_key.clone())))).collect_vec(),
            meta: LQGroup_BatchesMeta::new(/*500*/),

            channel_for_batch_messages__sender_base: s1,
            channel_for_batch_messages__receiver_base: r1,

            //source_sender_for_lq_watcher_drops: s1,

            messages_in_sender,
            messages_out_sender,
            processed_or_sent_messages: vec![],
        };

        new_self
    }

    async fn send_message_out(&mut self, msg: LQGroup_OutMsg) {
        let msg_as_str = format!("{:?}", msg);
        self.messages_out_sender.broadcast(msg).await.unwrap();
        self.notify_message_processed_or_sent(msg_as_str, true);
    }
    /// This function should receive a stringified version of all messages sent through the LQGroup "messages_in" and "messages_out" channels.
    pub(super) fn notify_message_processed_or_sent(&mut self, msg_as_str: String, sent: bool) {
        self.processed_or_sent_messages.push(format!("{}{}", if sent { "Sent: " } else { "Processed: " }, msg_as_str));

        // for debugging
        /*if !msg_as_str.contains("IGJDsdE-TKGx-K7T4etO5Q") { return; }
        println!("\t{} message just sent: {}", if sent { "OUT" } else { "IN" }, msg_as_str);*/
    }
    pub(super) fn get_recent_messages_str(&self) -> String {
        let mut recent_messages = self.processed_or_sent_messages.clone();
        recent_messages.reverse();
        let recent_messages = recent_messages.into_iter().take(10).collect_vec();
        format!("[newest first...] \n\t{}", recent_messages.join("\n\t"))
    }

    // maybe temp; needed for refresh_lq_data... func in LQGroup
    pub(super) fn get_lqis_committed_cloned(&self) -> IndexMap<LQKey, Arc<LQInstance>> {
        self.meta.lqis_committed.clone()
    }

    pub(super) fn get_buffering_batch(&mut self) -> (usize, &RwLock<LQBatch>) {
        //let index = self.batches.len() - 1;
        //let index = meta.last_batch_buffering_started_index as usize;
        let mut first_open_index = (self.meta.last_batch_execution_started_index + 1) as usize;
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

    pub(super) async fn schedule_lqi_read_or_init_then_broadcast(&mut self, lq_key: &LQKey, force_queue_lqi: Option<Arc<LQInstance>>, parent_mtx: Option<&Mtx>) -> Option<Arc<LQInstance>> {
        new_mtx!(mtx, "1:start loop to get/create the lq-instance", parent_mtx);
        let mut i = -1;
        loop {
            i += 1;
            mtx.section(format!("X:start loop with i={i}"));
            match self.get_lq_instance_or_queue_it_in_progressing_batch(&lq_key, force_queue_lqi.clone(), Some(&mtx)).await {
                Ok(result) => {
                    match result {
                        Some(lqi) => {
                            // if instance's initial contents are already populated, just return it (well, after broadcasting an event so async caller knows about it)
                            if lqi.last_entries_set_count.load(Ordering::SeqCst) > 0 {
                                self.send_message_out(LQGroup_OutMsg::LQInstanceIsInitialized(lqi.lq_key.clone(), lqi.clone(), false)).await;
                                mtx.section(format!("LQ-instance retrieved and returned, since already initialized. @lq_key:{}", lqi.lq_key));
                                return Some(lqi);
                            }
                            // else, it must still be scheduled for population in a buffering/executing batch; so just return none (batch will automatically broadcast messages for the lqi's initialization once it happens)
                            else {
                                mtx.section(format!("LQ-instance already scheduled in a progressing-batch. @lq_key:{}", lqi.lq_key));
                                return None;
                            }
                        },
                        None => {
                            // if instance was scheduled for initialization in batch, return none (batch will automatically broadcast messages for the lqi's initialization once it happens)
                            mtx.section(format!("LQ-instance just scheduled in buffering-batch. @lq_key:{}", lq_key));
                            return None;
                        },
                    }
                },
                // if we hit an error, retry in a bit
                Err(err) => {
                    error!("Hit error during attempt to get or create lqi, probably due to multi-threading contention. Retrying in a bit. Error: {}", err);
                    mtx.section("X.1:waiting a bit, before retrying");
                    time::sleep(Duration::from_millis(500)).await;
                    continue;
                }
            };
        }
    }

    /// Finds the lq-instance for the given lq-key in the committed-lqis list (if present), else...
    /// finds it in the lqis-awaiting-population list (if present), else...
    /// creates it in the buffering-batch (and adds it to the awaiting-population list), then waits for its data-population and committal into `LQGroup.lqis_committed`.
    async fn get_lq_instance_or_queue_it_in_progressing_batch(&mut self, lq_key: &LQKey, force_queue_lqi: Option<Arc<LQInstance>>, mtx_p: Option<&Mtx>) -> Result<Option<Arc<LQInstance>>, Error> {
        new_mtx!(mtx, "1:find lqi in an executing/buffering batch, or create new lqi in the buffering-batch", mtx_p);
        let (batch_index, batch_generation, prior_lqis_in_batch, _lqi_in_batch, _lqi_just_initialized, _batch_msg_receiver) = 'getter_block: {
            mtx.section("2:get batches_meta write-lock");

            // create receiver now, so we start receiving all messages from this point
            let batch_msg_receiver = self.channel_for_batch_messages__sender_base.new_receiver();

            mtx.section("3:try to find lqi in lq-group's committed lqi's");
            if let Some(lqi) = self.meta.lqis_committed.get(lq_key) {
                return Ok(Some(lqi.clone()));
            }

            // if this lq_key is already added to a batch, and awaiting population, simply find the relevant lq-instance in that batch and return it
            mtx.section("4:try to find lqi in relevant batch");
            if let Some(entry) = self.meta.lqis_awaiting_population.get(lq_key) && force_queue_lqi.is_none() {
                //(entry.batch_index, entry.batch_generation, entry.prior_lqis_in_batch, entry.lqi.clone(), false, batch_msg_receiver)
                return Ok(Some(entry.lqi.clone()));
            }
            // else, create a new lq-instance for this lq-key, and add it to the buffering-batch
            else {
                mtx.section("5:lqi not found in either lqis_committed or in lqis_awaiting_population; will queue it in progressing batch");

                mtx.section("6:get batch write-lock, and insert");
                let (batch_index, batch_lock) = self.get_buffering_batch();

                //drop(lqis_awaiting_population);
                //drop(meta);
                //check_lock_order::<{Lock::LQGroup_batches_meta}, {Lock::LQGroup_batches_x}>();
                let mut batch = batch_lock.write().await;
                let batch_gen = batch.get_generation();
                
                let lqis_in_batch = &mut batch.query_instances;
                let prior_lqis_in_batch = lqis_in_batch.len();

                let lqi = match force_queue_lqi {
                    Some(passed_lqi_arc) => {
                        lqis_in_batch.insert(lq_key.to_owned(), passed_lqi_arc.clone());
                        passed_lqi_arc
                    },
                    None => {
                        if let Some(lqi_arc) = lqis_in_batch.get(lq_key) {
                            warn!("The buffering batch contains an entry for this lq-key; this case would ideally be handled by the `lq_keys_awaiting_population` check above, but can miss if lqis_awaiting_population was changed between the drop(lqis_awaiting_population) above and this line; handling, by using the already-added-to-buffering-batch lqi.");
                            break 'getter_block (batch_index, batch_gen, prior_lqis_in_batch, lqi_arc.clone(), false, batch_msg_receiver);
                        }

                        let entries = vec![];
                        let new_lqi = LQInstance::new(lq_key.clone(), entries.clone());
                        // let monitor-tool know about this lq-instance, even prior to its being populated with data or "committed" to the lq-group
                        new_lqi.send_self_to_monitor_backend(entries, 0).await;
                        
                        let new_lqi_arc = Arc::new(new_lqi);
                        lqis_in_batch.insert(lq_key.to_owned(), new_lqi_arc.clone());
                        new_lqi_arc
                    }
                };
                let batch_gen = batch.get_generation();
                drop(batch);

                mtx.section("7:insert lqi and such into lqis_awaiting_population");
                {
                    /*check_lock_order::<{Lock::LQGroup_batches_x}, {Lock::LQGroup_lqis_awaiting_population}>();
                    let mut lqis_awaiting_population = self.lqis_awaiting_population.write("get_or_create_lq_instance_in_progressing_batch").await;*/
                    //let mut meta = self.batches_meta.write("get_or_create_lq_instance_in_progressing_batch").await;
                    self.meta.lqis_awaiting_population.insert(lq_key.to_owned(), LQIAwaitingPopulationInfo {
                        batch_index,
                        batch_generation: batch_gen,
                        prior_lqis_in_batch,
                        lqi: lqi.clone(),
                    });
                }

                (batch_index, batch_gen, prior_lqis_in_batch, lqi, true, batch_msg_receiver)
            }
        };

        mtx.section_2("3:schedule batch for execution", Some(format!("@prior_lqis_in_batch:{prior_lqis_in_batch}")));
        self.schedule_batch_for_execution(batch_index, batch_generation, Some(&mtx)).await?;
        //Ok((lqi_in_batch, lqi_just_initialized))
        Ok(None)
    }

    //async fn execute_batch_x_once_ready() {}
    async fn schedule_batch_for_execution(&mut self, batch_i: usize, batch_generation: usize, mtx_p: Option<&Mtx>) -> Result<(), Error> {
        new_mtx!(mtx, "1:prep", mtx_p, Some(format!("@batch_i:{batch_i} @batch_generation:{batch_generation}")));
        let last_batch_execution_time = self.meta.last_batch_execution_started_time;

        let batch_lock_arc_clone = self.batches.get(batch_i).unwrap().clone();
        let messages_in_sender_clone = self.messages_in_sender.clone();

        mtx.section("2:wait for the correct time to execute");
        let mtx_proxy = mtx.proxy();
        tokio::spawn(async move {
            // todo: fine-tune these settings, as well as scale-up algorithm
            const LQ_BATCH_DURATION_MIN: f64 = 100f64;
            //const LQ_BATCH_DURATION_MAX: f64 = 100f64;
            let batch_end_time = last_batch_execution_time + LQ_BATCH_DURATION_MIN;
            let time_till_batch_end = batch_end_time - time_since_epoch_ms();
            tokio::time::sleep(Duration::try_from_secs_f64(time_till_batch_end / 1000f64).unwrap_or(Duration::from_secs(0))).await;

            // NOTE: Multiple instances of this call-path may be executing concurrently; they "race" to be the one that makes it to this upcoming line.
            // The first one to make it, sets the batch's "execution_in_progress" to true, so that the other concurrent calls all fail the if-check, and do nothing.
            let mut batch = batch_lock_arc_clone.write().await;
            if batch.get_generation() == batch_generation && !batch.execution_in_progress {
                batch.execution_in_progress = true;
                let _ = messages_in_sender_clone.send(LQGroup_InMsg::OnBatchReachedTimeToExecute(batch_i, Some(mtx_proxy)));
            }
        });

        Ok(())
    }

    pub(super) async fn execute_batch(&mut self, batch_i: usize, mtx_p: Option<&Mtx>) {
        //new_mtx!(mtx, "1:setup", mtx_p, Some(format!("@batch_i:{} @batch_generation:{} @batch_lqi_count:{}", batch_i, batch_generation, batch.query_instances.len()));
        new_mtx!(mtx, "1:setup", mtx_p, Some(format!("@batch_i:{batch_i}")));
        //mtx_proxy.section("1:setup"); //, Some(format!("", )));

        self.meta.last_batch_execution_started_index = batch_i as i64;
        self.meta.last_batch_execution_started_time = time_since_epoch_ms();
        //drop(meta); // drop lock on meta prior to executing batch

        let client = self.db_pool.get().await.unwrap();
        //batch.execute(&client, Some(&mtx2)).await.expect("Executing the lq-batch failed!");

        let batch_lock_arc_clone = self.batches.get(batch_i).unwrap().clone();
        let messages_in_sender_clone = self.messages_in_sender.clone();

        mtx.section("2:start async part");
        let mut mtx_proxy = mtx.proxy();
        // we can't block the message-loop, so receive results in new thread, then simply send data through message
        tokio::spawn(async move {
            mtx_proxy.section("1:get write-lock on batch");
            //check_lock_order::<{Lock::LQGroup_batches_meta}, {Lock::LQGroup_batches_x}>();
            let mut batch = batch_lock_arc_clone.write().await;
            //if batch.get_generation() == batch_generation {

            mtx_proxy.section("2:execute batch query");
            batch.execute(&client, Some(&mtx_proxy)).await.expect("Executing the lq-batch failed!");

            //mtx2.section("3:reset batch, and drop batch write-lock");
            mtx_proxy.section("3:read batch results, and send-message about batch being completed");
            let instances_in_batch = batch.mark_generation_end_and_reset().into_iter().map(|a| a.1).collect_vec();
            // ignore send-error; if all receivers dropped, then result doesn't matter anyway
            let _ = messages_in_sender_clone.send(LQGroup_InMsg::OnBatchCompleted(batch_i, instances_in_batch));

            mtx_proxy.section("4:set execution_in_progress to false");
            batch.execution_in_progress = false;
            drop(batch); // drop write-lock on batch
            drop(mtx_proxy); // drop mtx_proxy explicitly, so timing-data is correct (drop of tokio threads is often delayed)
        });
    }

    pub(super) async fn on_batch_completed(&mut self, batch_i: usize, instances_in_batch: Vec<Arc<LQInstance>>) {
        new_mtx!(mtx, "1:get length of instances_in_batch");
        let instances_in_batch_len = instances_in_batch.len();
        let instances_in_batch_lq_keys = instances_in_batch.iter().map(|a| a.lq_key.clone()).collect_vec();
        
        mtx.section("5:commit the lqi's in batch to overall group, and update batches-meta");
        //mtx2.section_2("5:commit the lqi's in batch to overall group, and update batches-meta", Some(format!("@open-locks:{}", meta.lqis_committed.get_live_guards_str())));
        {
            // Acquire lock on lq_keys_awaiting_population first; this way, code in `get_or_create_lq_instance_in_progressing_batch` knows that as long as it holds a read-lock:
            // 1) It is safe to create the receiver that is then used to wait for the batch's execution. (ie. we have not yet broadcast the `LQBatchMessage::NotifyExecutionDone` message)
            /*check_lock_order::<{Lock::LQGroup_batches_meta}, {Lock::LQGroup_lqis_awaiting_population}>();
            let mut lq_keys_awaiting_population = self.lqis_awaiting_population.write("execute_batch_x_once_ready").await;*/
            
            //let instances_in_batch = batch.query_instances.read().await;
            for new_lqi in instances_in_batch.into_iter() {
                let key = &new_lqi.lq_key;
                let old_lqi = self.meta.lqis_committed.insert(key.to_owned(), new_lqi.clone());
                if let Some(old_lqi) = old_lqi {
                    // if an old-lqi was replaced, but in fact that "old lqi" was the same lqi...
                    if Arc::ptr_eq(&new_lqi.clone(), &old_lqi) {
                        // ...then this "recommit" is just due to a `refresh_lq_data_for_x` call (see function below) and is fine; do nothing
                    }
                    // else, the new-lqi is in fact a new instance/allocation (which means we need to merge the old-lqi into the new-lqi, as smoother alternative to erroring/retrying)
                    else {
                        // drain the old-watchers vector; this way watchers will only be getting updates from the new-lqi
                        let old_watchers: Vec<(Uuid, LQEntryWatcher)> = old_lqi.entry_watchers.write().await.drain().collect_vec();
                        let old_watchers_count = old_watchers.len();

                        //check_lock_order::<{Lock::LQGroup_batches_meta}, {Lock::LQInstance_last_entries}>();
                        let latest_entries = new_lqi.last_entries.read().await.clone();

                        let new_lqi = self.meta.lqis_committed.get(key).ok_or(anyhow!("New-lqi not found!")).unwrap();
                        //check_lock_order::<{Lock::LQGroup_batches_meta}, {Lock::LQInstance_entry_watchers}>();
                        let mut new_watchers = new_lqi.entry_watchers.write().await;
                        for (old_stream_id, old_watcher) in old_watchers {
                            // since lqi that old-watcher was attached to might have had a not-yet-updated entries-set, send each watcher the latest entries-set
                            old_watcher.new_entries_channel_sender.send(latest_entries.clone()).unwrap();

                            new_watchers.insert(old_stream_id, old_watcher);
                        }

                        // commented; not needed, since a call to this will occur soon back up in the `start_lq_watcher` function (through its call to `get_or_create_watcher`)
                        //new_lqi.send_self_to_monitor_backend(new_entries, entry_watchers.len()).await;

                        error!("After batch completed, lq-instance was being committed, but an earlier entry was found; this should never happen. Nonetheless, as defensive programming, attempting to resolve by merging the watchers... {}",
                            format!(
                                "@batch_i:{} @old_count:{} @new_count:{} @final_count:{} @recent_messages:{}",
                                batch_i, /*batch_generation,*/ old_watchers_count, new_watchers.len() - old_watchers_count, new_watchers.len(), self.get_recent_messages_str()
                            )
                        );
                    }
                }
            }
            mtx.current_section.extra_info = Some(format!("@group_lqi_count:{} @batch_lqi_count:{}", self.meta.lqis_committed.len(), instances_in_batch_len));

            // now that we've "committed" this batch's lqi's to the lq-group, remove their lq-keys from the `lq_keys_awaiting_population` list
            for lq_key in instances_in_batch_lq_keys {
                if let Some(info) = self.meta.lqis_awaiting_population.shift_remove(&lq_key) {
                    self.send_message_out(LQGroup_OutMsg::LQInstanceIsInitialized(lq_key, info.lqi, true)).await;
                }
            }

            self.meta.last_batch_committed_index = batch_i as i64;
            //meta.last_batch_buffering_started_index = batch_i as i64;
        }

        mtx.section("6:send message notifying of execution being done");
        self.channel_for_batch_messages__sender_base.broadcast(LQBatchMessage::NotifyExecutionDone(batch_i)).await.unwrap();
    }

    /// If the caller function itself is a potential "completer" of the batch, then the `receiver` it provides to this function must be
    /// created (using `self.channel_for_batch_messages__sender_base.new_receiver()`) *prior* to sending of the "batch completed" message.
    async fn wait_for_batch_to_complete(&self, batch_i: usize, timeout_secs: u64, mut batch_msg_receiver: ABReceiver<LQBatchMessage>) -> Result<(), Error> {
        loop {
            let wait_for_execution_done = async {
                loop {
                    let msg = batch_msg_receiver.recv().await.unwrap();
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
                    error!("Timed out waiting for confirmation of batch-execution completion. Retrying this request shortly... @table:{} @filter_shape:{}", self.lq_key.table_name, self.lq_key.filter);
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
    pub(super) async fn drop_lq_watcher(&mut self, lq_key: &LQKey, stream_id: Uuid) {
        new_mtx!(mtx, "1:get query_instances write-lock");
        debug!("Got lq-watcher drop request. @table:{} @filter:{} @stream_id:{}", lq_key.table_name, lq_key.filter, stream_id);

        mtx.section("2:get lq_instance for key, then get lq_instance.entry_watcher write-lock");
        let new_watcher_count = {
            let lq_instance = match self.meta.lqis_committed.get_mut(lq_key) {
                Some(a) => a,
                None => return, // if entry already deleted, just ignore for now [maybe fixed after change to get_or_create_lq_instance?]
            };
            //check_lock_order::<{Lock::LQGroup_batches_meta}, {Lock::LQInstance_entry_watchers}>();
            let mut entry_watchers = lq_instance.entry_watchers.write().await;
            
            mtx.section("3:update entry_watchers, then remove lq_instance (if no watchers), then complete");
            // commented the `.expect`, since was failing occasionally, and I don't have time to debug atm [maybe fixed after change to get_or_create_lq_instance?]
            //let _removed_value = entry_watchers.remove(&stream_id).expect(&format!("Trying to drop LQWatcher, but failed, since no entry was found with this key:{}", lq_key));
            entry_watchers.remove(&stream_id);

            // only send update for lqi if we're not about to be deleted
            if entry_watchers.len() > 0 {
                // todo: try to find a way to provide an up-to-date result_entries without getting a read-lock here (since wasn't necessary before sending-to-backend behavior)
                check_lock_order::<{Lock::LQInstance_entry_watchers}, {Lock::LQInstance_last_entries}>();
                let current_entries = lq_instance.last_entries.read().await.clone();
                lq_instance.send_self_to_monitor_backend(current_entries, entry_watchers.len()).await;
            }
            
            entry_watchers.len()
        };
        if new_watcher_count == 0 {
            self.meta.lqis_committed.shift_remove(lq_key);
            debug!("Watcher count for live-query entry dropped to 0, so removing.");

            //let lq_key = get_lq_instance_key(&self.table_name, &self.filter);
            if let Err(err) = MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(Message_ASToMB::LQInstanceUpdated {
                table_name: lq_key.table_name.to_owned(),
                filter: serde_json::to_value(lq_key.filter.clone()).unwrap(),
                last_entries: vec![],
                watchers_count: 0u32,
                deleting: true,
            }).await {
                error!("Errored while broadcasting LQInstanceUpdated message. @error:{}", err);
            }
        }

        debug!("LQ-watcher drop complete. @watcher_count_for_entry:{} @lq_entry_count:{}", new_watcher_count, self.meta.lqis_committed.len());
    }
    
    pub(super) async fn notify_of_ld_change(&self, change: &LDChange) {
        if self.lq_key.table_name != change.table {
            return;
        }
        
        for (_lq_key, lq_instance) in self.meta.lqis_committed.iter() {
            lq_instance.on_table_changed(&change, None).await;
        }
    }
}