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
use crate::utils::mtx::mtx::{Mtx, new_mtx};
use crate::utils::type_aliases::JSONValue;

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

pub enum LQBatchMessage {
    Execute,
}
pub struct LQGroup {
    // shape
    pub table_name: String,
    pub filter_shape: QueryFilter,

    // for coordination of currently-buffering batches
    pub channel_for_batch_messages__sender_base: Sender<LQBatchMessage>,
    pub channel_for_batch_messages__receiver_base: Receiver<LQBatchMessage>,
    
    /// The last batch whose contents were committed. (to LQGroup.query_instances)
    pub last_committed_batch: RwLock<Option<LQBatch>>,
    /// The next batch to be committed. (until it's committed, the lq-instances are not active)
    pub next_batch: RwLock<LQBatch>,

    /// Map of committed live-query instances.
    pub query_instances: RwLock<IndexMap<String, Arc<LQInstance>>>,
    //source_sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>,
}
impl LQGroup {
    pub fn new(table_name: String, filter_shape: QueryFilter) -> Self {
        let (s1, r1): (Sender<LQBatchMessage>, Receiver<LQBatchMessage>) = flume::unbounded();
        //let r1_clone = r1.clone(); // clone needed for tokio::spawn closure below
        let new_self = Self {
            table_name: table_name.clone(),
            filter_shape: filter_shape.clone(),

            last_committed_batch: RwLock::new(None),
            //next_batch: LQBatch::default(),
            next_batch: RwLock::new(LQBatch::new(table_name.clone(), filter_shape.clone())),

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

    /*pub async fn execute_current_batch(&mut self) {
    }*/

    pub async fn start_lq_watcher<'a, T: From<Row> + Serialize + DeserializeOwned>(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid, ctx: &async_graphql::Context<'_>, parent_mtx: Option<&Mtx>) -> (Vec<T>, LQEntryWatcher) {
        new_mtx!(mtx, "1:get lq read-lock", parent_mtx);
        /*let mut mtx = crate::utils::mtx::mtx::Mtx::new(crate::utils::mtx::mtx::fn_name!());
        mtx.section("part1");
        mtx.parent = parent_mtx;*/

        let lq_key = get_lq_instance_key(table_name, filter);
        let (mut lqi_active, create_new_instance) = {
            let lq_instances = self.query_instances.read().await;
            let create_new_instance = !lq_instances.contains_key(&lq_key);
            (lq_instances.len(), create_new_instance)
        };

        mtx.section("2:get entries");
        let new_lq_instance = match create_new_instance {
            true => {
                /*let (result_entries, _result_entries_as_type) = get_entries_in_collection::<T>(ctx, table_name.to_owned(), filter, Some(&mtx)).await.expect("Errored while getting entries in collection.");
                Some(LQInstance::new(table_name.to_owned(), filter.clone(), result_entries))*/
                Some(LQInstance::new(table_name.to_owned(), filter.clone(), vec![]))
            },
            false => None,
        };
        let lq_entry_is_new = new_lq_instance.is_some();

        mtx.section("3:get lq write-lock, then possibly insert lq-instance, then read lq-instance");
        let (instance, lqi_bufferred) = {
            let next_batch = LQBatch::new(self.table_name.clone(), self.filter_shape.clone());
            
            //let batch = mem::replace(&mut self.next_batch, RwLock::new(next_batch));
            //let batch = mem::replace(self.next_batch.get_mut(), next_batch);
            let mut next_batch_ref = self.next_batch.write().await;
            let batch = mem::replace(&mut *next_batch_ref, next_batch);

            //let mut live_queries = self.query_instances.write().await;
            let (instance, lqi_bufferred) = {
                let mut instances_in_batch = batch.query_instances.write().await;
                if let Some(new_entry) = new_lq_instance {
                    //live_queries.insert(lq_key.clone(), Arc::new(new_entry));
                    instances_in_batch.insert(lq_key.clone(), Arc::new(new_entry));
                }
                let instance = instances_in_batch.get(&lq_key).unwrap();
                if lq_entry_is_new { lqi_active += 1; }
                (instance.clone(), instances_in_batch.len())
            };

            mtx.section("4:wait for batch to execute, then grab the result");
            
            // temp; just immediately execute the (single item) batch ourselves
            //self.channel_for_batch_messages__sender_base.send(LQBatchMessage::Execute);
            //self.execute_current_batch();
            batch.execute(ctx, Some(&mtx)).await.expect_lazy(|_| format!("Got error executing live-query batch. @filter_shape:{}", self.filter_shape));

            mtx.section("5:commit the current batch");
            {
                let instances_in_batch = batch.query_instances.read().await;
                let mut query_instances = self.query_instances.write().await;
                for (key, value) in instances_in_batch.iter() {
                    query_instances.insert(key.to_owned(), value.clone());
                }
            }

            // store batch as the "last committed batch"
            let mut last_committed_batch_ref = self.last_committed_batch.write().await;
            *last_committed_batch_ref = Some(batch);

            (instance, lqi_bufferred)
        };

        let last_entries = instance.last_entries.read().await;

        mtx.section("5:convert + return");
        let result_entries = last_entries.clone();
        let result_entries_as_type: Vec<T> = json_maps_to_typed_entries(result_entries);

        //let watcher = entry.get_or_create_watcher(stream_id);
        let old_watcher_count = instance.entry_watchers.read().await.len();
        let (watcher, watcher_is_new) = instance.get_or_create_watcher(stream_id).await;
        let new_watcher_count = old_watcher_count + if watcher_is_new { 1 } else { 0 };
        let watcher_info_str = format!("@watcher_count_for_this_lq_entry:{} @collection:{} @filter:{:?} @lqi_active:{} @lqi_buffered:{}", new_watcher_count, table_name, filter, lqi_active, lqi_bufferred);
        println!("LQ-watcher started. {}", watcher_info_str);
        // atm, we do not expect more than 20 users online at the same time; so if there are more than 20 watchers of a single query, log a warning
        if new_watcher_count > 4 {
            println!("WARNING: LQ-watcher count unusually high ({})! {}", new_watcher_count, watcher_info_str);
        }
        
        (result_entries_as_type, watcher.clone())
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

// todo: fine-tune these settings, as well as scale-up algorithm
const LQ_BATCH_DURATION_MIN: usize = 100;
const LQ_BATCH_DURATION_MAX: usize = 100;