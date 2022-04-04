use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
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
use crate::utils::db::filter::{entry_matches_filter, QueryFilter};
use crate::utils::db::handlers::json_maps_to_typed_entries;
use crate::utils::db::postgres_parsing::LDChange;
use crate::utils::db::queries::{get_entries_in_collection};
use crate::utils::mtx::mtx::{Mtx, new_mtx};
use crate::utils::type_aliases::JSONValue;

use super::lq_instance::{LQInstance, LQEntryWatcher};

pub fn filter_shape_from_filter(filter: &QueryFilter) -> QueryFilter {
    let filter_shape = filter.clone();
    for (field_name, field_filter) in filter.field_filters {
        for (op, val) in field_filter.filter_ops {
            let filter_ops_new = filter_shape.field_filters.get(&field_name).unwrap().filter_ops;
            filter_ops_new.insert(op, JSONValue::Null);
        }
    }
    filter_shape
}
pub fn get_lq_group_key(table_name: &str, filter: &QueryFilter) -> String {
    //format!("@table:{} @filter:{:?}", table_name, filter)

    let filter_shape = filter.clone();
    for (field_name, field_filter) in filter.field_filters {
        for (op, val) in field_filter.filter_ops {
            let filter_ops_new = filter_shape.field_filters.get(&field_name).unwrap().filter_ops;
            filter_ops_new.insert(op, JSONValue::Null);
        }
    }
    
    json!({
        "table": table_name,
        "filter": filter_shape,
    }).to_string()
}

pub enum LQBatchMessage {
    Start,
}
pub struct LQGroup {
    // shape
    pub table_name: String,
    pub filter_shape: QueryFilter,

    /// A "batch" may be as small as one query, if first/isolated.
    pub last_batch_execution_time: Option<f64>,
    
    // for coordination of currently-buffering batches
    pub channel_for_batch_start__sender_base: Sender<LQBatchMessage>,
    pub channel_for_batch_start__receiver_base: Receiver<LQBatchMessage>,

    // for specific live-query entries (ie. one for each set of values supplied for the shape/template)
    pub query_instances: RwLock<HashMap<String, LQInstance>>,
    //source_sender_for_lq_watcher_drops: Sender<DropLQWatcherMsg>,
}
impl LQGroup {
    pub fn new(table_name: String, filter_shape: QueryFilter) -> Self {
        let (s1, r1): (Sender<LQBatchMessage>, Receiver<LQBatchMessage>) = flume::unbounded();
        let new_self = Self {
            table_name,
            filter_shape,

            last_batch_execution_time: None,

            channel_for_batch_start__sender_base: s1,
            channel_for_batch_start__receiver_base: r1,

            query_instances: RwLock::new(HashMap::new()),
            //source_sender_for_lq_watcher_drops: s1,
        };

        // start this listener for batch requests
        tokio::spawn(async move {
            loop {
                let msg = r1.recv_async().await.unwrap();
                match msg {
                    LQBatchMessage::Start => {
                        // todo
                    },
                };
            }
        });

        new_self
    }

    pub async fn start_lq_watcher<'a, T: From<Row> + Serialize + DeserializeOwned>(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid, ctx: &async_graphql::Context<'_>, parent_mtx: Option<&Mtx>) -> (Vec<T>, LQEntryWatcher) {
        new_mtx!(mtx, "1:get lq read-lock", parent_mtx);
        /*let mut mtx = crate::utils::mtx::mtx::Mtx::new(crate::utils::mtx::mtx::fn_name!());
        mtx.section("part1");
        mtx.parent = parent_mtx;*/

        let lq_key = get_lq_instance_key(table_name, filter);
        let (mut lq_entries_count, create_new_entry) = {
            let live_queries = self.query_instances.read().await;
            let lq_entries_count = live_queries.len();
            let create_new_entry = !live_queries.contains_key(&lq_key);
            (lq_entries_count, create_new_entry)
        };

        mtx.section("2:get entries");
        let new_entry = match create_new_entry {
            true => {
                let (result_entries, _result_entries_as_type) = get_entries_in_collection::<T>(ctx, table_name.to_owned(), filter, Some(&mtx)).await.expect("Errored while getting entries in collection.");
                Some(LQInstance::new(table_name.to_owned(), filter.clone(), result_entries))
            },
            false => None,
        };
        let lq_entry_is_new = new_entry.is_some();

        mtx.section("3:get lq write-lock, then update");
        let mut live_queries = self.query_instances.write().await;
        let entry = {
            if let Some(new_entry) = new_entry {
                live_queries.insert(lq_key.clone(), new_entry);
            }
            let entry = live_queries.get_mut(&lq_key).unwrap();
            if lq_entry_is_new { lq_entries_count += 1; }
            entry
        };

        mtx.section("4:convert + return");
        let result_entries = entry.last_entries.clone();
        let result_entries_as_type: Vec<T> = json_maps_to_typed_entries(result_entries);

        //let watcher = entry.get_or_create_watcher(stream_id);
        let old_watcher_count = entry.entry_watchers.len();
        let (watcher, watcher_is_new) = entry.get_or_create_watcher(stream_id);
        let new_watcher_count = old_watcher_count + if watcher_is_new { 1 } else { 0 };
        let watcher_info_str = format!("@watcher_count_for_this_lq_entry:{} @collection:{} @filter:{:?} @lq_entry_count:{}", new_watcher_count, table_name, filter, lq_entries_count);
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
        let live_query = live_queries.get_mut(&lq_key).unwrap();
        let _removed_value = live_query.entry_watchers.remove(&stream_id).expect(&format!("Trying to drop LQWatcher, but failed, since no entry was found with this key:{}", lq_key));
        
        let new_watcher_count = live_query.entry_watchers.len();
        if new_watcher_count == 0 {
            live_queries.remove(&lq_key);
            println!("Watcher count for live-query entry dropped to 0, so removing.");
        }

        println!("LQ-watcher drop complete. @watcher_count_for_this_lq_entry:{} @lq_entry_count:{}", new_watcher_count, live_queries.len());
    }
    
    pub async fn notify_of_ld_change(&self, change: &LDChange) {
        //let mut storage = storage_wrapper.write().await;
        let mut live_queries = self.query_instances.write().await;
        let mut1 = live_queries.iter_mut();
        for (lq_key, lq_info) in mut1 {
            let lq_key_json: JSONValue = serde_json::from_str(lq_key).unwrap();
            if lq_key_json["table"].as_str().unwrap() != change.table { continue; }
            /*for (stream_id, change_listener) in lq_info.change_listeners.iter_mut() {
                change_listener(&lq_info.last_entries);
            }*/
            lq_info.on_table_changed(&change);
        }
    }
}

// todo: fine-tune these settings, as well as scale-up algorithm
const LQ_BATCH_DURATION_MIN: usize = 100;
const LQ_BATCH_DURATION_MAX: usize = 100;