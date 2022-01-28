use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use serde_json::json;
use tokio::sync::broadcast;
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

use crate::utils::type_aliases::JSONValue;

// todo: merge AppState and Storage

pub struct AppState {
    pub user_set: Mutex<HashSet<String>>,
    pub tx: broadcast::Sender<String>,
}

pub type Storage = Arc<Mutex<LQStorage>>;
pub type Filter = Option<JSONValue>;
#[derive(Default)]
pub struct LQStorage {
    pub live_queries: HashMap<JSONValue, LQEntry>,
}
impl LQStorage {
    pub fn new() -> Self {
        Self {
            live_queries: HashMap::new(),
        }
    }
    pub fn notify_lq_start(&mut self, collection_name: &str, filter: &Filter, change_listener: LQChangeListener) {
        let lq_key = get_lq_key(collection_name, &filter);
        let entry = self.live_queries.entry(lq_key).or_insert(LQEntry::new(collection_name.to_owned(), filter.clone()));
        //entry.watcher_count += 1;
        entry.change_listeners.append(change_listener);
        println!("LQ started. @count:{} @collection:{} @filter:{:?}", entry.change_listeners.len(), collection_name, filter);
    }
    pub fn notify_lq_end(&mut self, collection_name: &str, filter: &Filter) {
        let lq_key = get_lq_key(collection_name, filter);
        let entry = self.live_queries.get_mut(&lq_key).unwrap();
        entry.watcher_count -= 1;
        let new_watcher_count = entry.watcher_count;
        if entry.watcher_count <= 0 {
            self.live_queries.remove(&lq_key);
        }
        println!("LQ ended. @count:{} @collection:{} @filter:{:?}", entry.change_listeners.len(), collection_name, filter);
    }
}
pub fn get_lq_key(collection_name: &str, filter: &Filter) -> JSONValue {
    //format!("@collection:{} @filter:{:?}", collection_name, filter)
    json!({
        "collection": collection_name,
        "filter": filter,
    })
}

pub type LQChangeListener = Box<dyn Fn(Vec<JSONValue>) -> ()>;

#[derive(Default)]
pub struct LQEntry {
    collection_name: String,
    filter: Filter,
    //watcher_count: i32,
    last_entries: Vec<JSONValue>,
    change_listeners: Vec<LQChangeListener>,
}
impl LQEntry {
    pub fn new(collection_name: String, filter: Filter) -> Self {
        Self { collection_name, filter, ..Default::default() }
    }
}