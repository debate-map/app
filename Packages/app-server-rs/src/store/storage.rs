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
use serde_json::json;
use tokio::sync::{broadcast, mpsc, Mutex};
use tokio_postgres::{Client};
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

use crate::utils::type_aliases::JSONValue;

// todo: merge AppState and Storage

pub struct AppState {
    pub user_set: std::sync::Mutex<HashSet<String>>,
    pub tx: broadcast::Sender<String>,
}

pub type Storage = Arc<Mutex<LQStorage>>;
pub type Filter = Option<JSONValue>;

//#[derive(Default)]
pub struct LQStorage {
    pub live_queries: Pin<Box<HashMap<String, LQEntry>>>,
}
impl LQStorage {
    pub fn new() -> Self {
        Self {
            live_queries: Box::pin(HashMap::new()),
        }
    }
    pub fn notify_lq_start(&mut self, table_name: &str, filter: &Filter, stream_id: Uuid, initial_entries: Vec<JSONValue>) {
        let lq_key = get_lq_key(table_name, &filter);
        let default = LQEntry::new(table_name.to_owned(), filter.clone(), initial_entries);
        let entry = self.live_queries.entry(lq_key).or_insert(default);
        entry.watcher_count += 1;
        println!("LQ started. @count:{} @collection:{} @filter:{:?}", entry.watcher_count, table_name, filter);
    }
    pub fn notify_lq_end(&mut self, table_name: &str, filter: &Filter, stream_id: Uuid) {
        let lq_key = get_lq_key(table_name, filter);
        let entry = self.live_queries.get_mut(&lq_key).unwrap();
        entry.watcher_count -= 1;
        let new_watcher_count = entry.watcher_count;
        if new_watcher_count <= 0 {
            self.live_queries.remove(&lq_key);
        }
        println!("LQ ended. @count:{} @table:{} @filter:{:?}", new_watcher_count, table_name, filter);
    }
}
pub fn get_lq_key(table_name: &str, filter: &Filter) -> String {
    //format!("@table:{} @filter:{:?}", table_name, filter)
    json!({
        "table": table_name,
        "filter": filter,
    }).to_string()
}

fn arcs_eq<T: ?Sized>(left: &Arc<T>, right: &Arc<T>) -> bool {
    let left : *const T = left.as_ref();
    let right : *const T = right.as_ref();
    left == right
}

pub struct LQEntryWatcher {
    pub new_entries_channel_sender: Sender<Vec<JSONValue>>,
    pub new_entries_channel_receiver: Receiver<Vec<JSONValue>>,
}
impl LQEntryWatcher {
    pub fn new() -> Self {
        let (tx, rx): (Sender<Vec<JSONValue>>, Receiver<Vec<JSONValue>>) = flume::unbounded();
        Self {
            new_entries_channel_sender: tx,
            new_entries_channel_receiver: rx,
        }
    }
}

//#[derive(Default)]
/// Holds the data related to a specific query (ie. collection-name + filter).
pub struct LQEntry {
    pub collection_name: String,
    pub filter: Filter,
    watcher_count: i32,
    pub last_entries: Vec<JSONValue>,
    //pub change_listeners: HashMap<Uuid, LQChangeListener<'a>>,
    pub entry_watchers: HashMap<Uuid, LQEntryWatcher>,
    /*pub new_entries_channel_sender: Sender<Vec<JSONValue>>,
    pub new_entries_channel_receiver: Receiver<Vec<JSONValue>>,*/
}
impl LQEntry {
    pub fn new(collection_name: String, filter: Filter, initial_entries: Vec<JSONValue>) -> Self {
        //let (s1, r1) = unbounded();
        Self {
            collection_name,
            filter,
            watcher_count: 0,
            last_entries: initial_entries,
            entry_watchers: HashMap::new(),
            /*new_entries_channel_sender: s1,
            new_entries_channel_receiver: r1,*/
        }
    }

    pub fn get_or_create_watcher(&mut self, stream_id: Uuid) -> &LQEntryWatcher {
        let watcher = self.entry_watchers.entry(stream_id).or_insert(LQEntryWatcher::new());
        watcher
    }

    pub fn on_table_changed(&mut self, change: &JSONValue) {
        let old_entries = &self.last_entries;

        // todo
        let new_entries = old_entries.clone();
        
        for (watcher_stream_id, watcher) in &self.entry_watchers {
            watcher.new_entries_channel_sender.send(new_entries.clone());
        }
        //self.new_entries_channel_sender.send(new_entries.clone());
        self.last_entries = new_entries;
    }

    /*pub async fn await_next_entries(&mut self, stream_id: Uuid) -> Vec<JSONValue> {
        let watcher = self.get_or_create_watcher(stream_id);
        let new_result = watcher.new_entries_channel_receiver.recv_async().await.unwrap();
        new_result
    }*/
}