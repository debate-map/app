use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
use std::str::FromStr;
use std::sync::Arc;
use rust_shared::async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use rust_shared::async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use flume::{Sender, Receiver, unbounded};
use rust_shared::serde::de::DeserializeOwned;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Map, self};
use rust_shared::tokio::sync::{mpsc, Mutex, RwLock};
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::{futures, axum, tower, tower_http};
use tower::Service;
use tower_http::cors::{CorsLayer, Origin};
use rust_shared::async_graphql::futures_util::task::{Context, Poll};
use rust_shared::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::body::{boxed, BoxBody, HttpBody};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, RequestParts, WebSocketUpgrade};
use axum::http::{self, Request, Response, StatusCode};
use axum::Error;
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, Stream, StreamExt, FutureExt};
use tracing::error;
use rust_shared::uuid::Uuid;

use crate::links::monitor_backend_link::{MESSAGE_SENDER_TO_MONITOR_BACKEND, Message_ASToMB};
use crate::utils::db::filter::{entry_matches_filter, QueryFilter};
use crate::utils::db::handlers::json_maps_to_typed_entries;
use crate::utils::db::pg_stream_parsing::{LDChange};
use crate::utils::type_aliases::RowData;
use crate::utils::db::queries::{get_entries_in_collection};
use crate::utils::general::general::rw_locked_hashmap__get_entry_or_insert_with;
use crate::utils::mtx::mtx::{Mtx, new_mtx};

#[derive(Clone)]
pub struct LQEntryWatcher {
    pub new_entries_channel_sender: Sender<Vec<RowData>>,
    pub new_entries_channel_receiver: Receiver<Vec<RowData>>,
}
impl LQEntryWatcher {
    pub fn new() -> Self {
        let (s1, r1): (Sender<Vec<RowData>>, Receiver<Vec<RowData>>) = flume::unbounded();
        Self {
            new_entries_channel_sender: s1,
            new_entries_channel_receiver: r1,
        }
    }
}

pub fn get_lq_instance_key(table_name: &str, filter: &QueryFilter) -> String {
    //format!("@table:{} @filter:{:?}", table_name, filter)
    json!({
        "table": table_name,
        "filter": filter,
    }).to_string()
}

//#[derive(Default)]
/// Holds the data related to a specific query (ie. collection-name + filter).
pub struct LQInstance {
    pub table_name: String,
    pub filter: QueryFilter,
    //watcher_count: i32,
    pub last_entries: RwLock<Vec<RowData>>,
    //pub change_listeners: HashMap<Uuid, LQChangeListener<'a>>,
    pub entry_watchers: RwLock<HashMap<Uuid, LQEntryWatcher>>,
    /*pub new_entries_channel_sender: Sender<Vec<JSONValue>>,
    pub new_entries_channel_receiver: Receiver<Vec<JSONValue>>,*/
}
impl LQInstance {
    pub fn new(table_name: String, filter: QueryFilter, initial_entries: Vec<RowData>) -> Self {
        //let (s1, r1) = unbounded();
        Self {
            table_name,
            filter,
            //watcher_count: 0,
            last_entries: RwLock::new(initial_entries),
            entry_watchers: RwLock::new(HashMap::new()),
            /*new_entries_channel_sender: s1,
            new_entries_channel_receiver: r1,*/
        }
    }

    pub async fn send_self_to_monitor_backend(&self, entries: Vec<RowData>, watcher_count: usize) {
        //let lq_key = get_lq_instance_key(&self.table_name, &self.filter);
        if let Err(err) = MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(Message_ASToMB::LQInstanceUpdated {
            table_name: self.table_name.clone(),
            filter: serde_json::to_value(self.filter.clone()).unwrap(),
            last_entries: entries,
            watchers_count: watcher_count as u32,
            deleting: false, // deletion event is sent from drop_lq_watcher func in lq_group.rs
        }).await {
            error!("Errored while broadcasting LQInstanceUpdated message. @error:{}", err);
        }
    }

    pub async fn get_or_create_watcher(&self, stream_id: Uuid, mtx_p: Option<&Mtx>, current_entries: Vec<RowData>) -> (LQEntryWatcher, bool, usize) {
        /*let entry_watchers = self.entry_watchers.write().await;
        let create_new = !self.entry_watchers.contains_key(&stream_id);
        let watcher = self.entry_watchers.entry(stream_id).or_insert_with(LQEntryWatcher::new);
        (watcher, create_new)*/
        let (watcher, just_created, new_count) = rw_locked_hashmap__get_entry_or_insert_with(&self.entry_watchers, stream_id, LQEntryWatcher::new, mtx_p).await;
        self.send_self_to_monitor_backend(current_entries, new_count).await;
        (watcher, just_created, new_count)

    }
    /*pub fn get_or_create_watcher(&mut self, stream_id: Uuid) -> (&LQEntryWatcher, usize) {
        let watcher = self.entry_watchers.entry(stream_id).or_insert(LQEntryWatcher::new());
        (&watcher, self.entry_watchers.len())
        /*if self.entry_watchers.contains_key(&stream_id) {
            return (self.entry_watchers.get(&stream_id).unwrap(), self.entry_watchers.len());
        }
        let watcher = LQEntryWatcher::new();
        self.entry_watchers.insert(stream_id, watcher);
        (&watcher, self.entry_watchers.len())*/
    }*/

    pub async fn on_table_changed(&self, change: &LDChange, mtx_p: Option<&Mtx>) {
        new_mtx!(mtx, "1:get last_entries read-lock, clone, then drop lock", mtx_p);
        let mut new_entries = self.last_entries.read().await.clone();

        mtx.section("2:calculate new_entries");
        let mut our_data_changed = false;
        match change.kind.as_str() {
            "insert" => {
                let new_entry = change.new_data_as_map().unwrap();
                let filter_check_result = entry_matches_filter(&new_entry, &self.filter)
                    .expect(&format!("Failed to execute filter match-check on new database entry. @table:{} @filter:{:?}", self.table_name, self.filter));
                if filter_check_result {
                    new_entries.push(new_entry);
                    our_data_changed = true;
                }
            },
            "update" => {
                let new_data = change.new_data_as_map().unwrap();
                // find entry (ie. row/doc) with the given id, in new_entries (ie. the new set of values that will be pushed to clients for this query)
                let entry_index = new_entries.iter_mut().position(|a| a["id"].as_str() == new_data["id"].as_str());
                match entry_index {
                    Some(entry_index) => {
                        // update the target entry's data to reflect the current change
                        let entry = new_entries.get_mut(entry_index).unwrap();
                        for key in new_data.keys() {
                            entry.insert(key.to_owned(), new_data[key].clone());
                            our_data_changed = true;
                        }
                        // check if the entry still matches the query's filter (if not, remove the entry from the query's results)
                        let filter_check_result = entry_matches_filter(entry, &self.filter)
                            .expect(&format!("Failed to execute filter match-check on updated database entry. @table:{} @filter:{:?}", self.table_name, self.filter));
                        if !filter_check_result {
                            new_entries.remove(entry_index);
                            our_data_changed = true;
                        }
                    },
                    None => {
                        // if the modified entry wasn't part of the result-set, it must not have matched the filter before the update; but check if it matches now
                        let filter_check_result = entry_matches_filter(&new_data, &self.filter)
                            .expect(&format!("Failed to execute filter match-check on updated database entry. @table:{} @filter:{:?}", self.table_name, self.filter));
                        if filter_check_result {
                            new_entries.push(new_data);
                            our_data_changed = true;
                        }
                    },
                };
            },
            "delete" => {
                let id = change.get_row_id();
                let entry_index = new_entries.iter().position(|a| a["id"].as_str().unwrap() == id);
                match entry_index {
                    Some(entry_index) => {
                        new_entries.remove(entry_index);
                        our_data_changed = true;
                    },
                    None => {},
                };
            },
            _ => {
                // ignore any other types of change (no need to even tell the watchers about it)
                return;
            },
        };
        if !our_data_changed { return; }

        new_entries.sort_by_key(|a| a["id"].as_str().unwrap().to_owned()); // sort entries by id, so there is a consistent ordering
        
        mtx.section("3:get entry_watchers read-lock, then notify each watcher of new_entries");
        let entry_watchers = self.entry_watchers.read().await;
        for (_watcher_stream_id, watcher) in entry_watchers.iter() {
            watcher.new_entries_channel_sender.send(new_entries.clone()).unwrap();
        }
        //self.new_entries_channel_sender.send(new_entries.clone());

        mtx.section("4:update the last_entries list");
        self.set_last_entries(new_entries.clone()).await;

        self.send_self_to_monitor_backend(new_entries, entry_watchers.len()).await;
    }

    pub async fn set_last_entries(&self, mut new_entries: Vec<RowData>) {
        let mut last_entries = self.last_entries.write().await;
        last_entries.drain(..);
        last_entries.append(&mut new_entries);
    }

    pub async fn get_last_entry_with_id(&self, entry_id: &str) -> Option<RowData> {
        let last_entries = self.last_entries.read().await;
        last_entries.iter().find(|entry2| {
            let entry2_id = entry2.get("id").and_then(|a| a.as_str()).map_or("", |a| a);
            entry2_id == entry_id
        }).cloned()
    }
    
    /*pub async fn await_next_entries(&mut self, stream_id: Uuid) -> Vec<JSONValue> {
        let watcher = self.get_or_create_watcher(stream_id);
        let new_result = watcher.new_entries_channel_receiver.recv_async().await.unwrap();
        new_result
    }*/
}
/*impl Drop for LQInstance {
    fn drop(&mut self) {
        let table_name = self.table_name.to_owned();
        let filter = self.filter.clone();
        // there might be an issue here where this async-chain ends up broadcasting later than it should, causing it to "overwrite" some "later" event
        // todo: fix this possible issue (perhaps by storing timestamp here, then canceling broadcast if another broadcast occurs before our actual broadcast)
        tokio::spawn(async move {
            //let lq_key = get_lq_instance_key(&self.table_name, &self.filter);
            if let Err(err) = MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(Message_ASToMB::LQInstanceUpdated {
                table_name,
                filter: serde_json::to_value(filter).unwrap(),
                last_entries: vec![],
                watchers_count: 0u32,
                deleting: true,
            }).await {
                error!("Errored while broadcasting LQInstanceUpdated message. @error:{}", err);
            }
        });
    }
}*/