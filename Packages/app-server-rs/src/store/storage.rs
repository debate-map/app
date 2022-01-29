use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
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
use uuid::Uuid;

use crate::utils::type_aliases::JSONValue;

// todo: merge AppState and Storage

pub struct AppState {
    pub user_set: Mutex<HashSet<String>>,
    pub tx: broadcast::Sender<String>,
}

pub type Storage<'a> = Arc<Mutex<LQStorage<'a>>>;
pub type Filter = Option<JSONValue>;

//pub type LQChangeListener<'a> = Arc<dyn FnMut(&Vec<JSONValue>) -> () + Send + Sync + 'a>;
pub type LQChangeListener<'a> = Box<dyn FnMut(&Vec<JSONValue>) -> () + Send + Sync + 'a>;
/*pub type LQChangeListener = Arc<LQChangeListener_Internal>;
pub struct LQChangeListener_Internal {
    //func: RefCell<dyn FnMut(&Vec<JSONValue>) -> () + Send + Sync>,
    pub func: Mutex<Box<dyn FnMut(&Vec<JSONValue>) -> () + Send + Sync>>,
}*/

//#[derive(Default)]
pub struct LQStorage<'a> {
    pub live_queries: Pin<Box<HashMap<String, LQEntry<'a>>>>,
}
impl<'a> LQStorage<'a> {
    pub fn new() -> Self {
        Self {
            live_queries: Box::pin(HashMap::new()),
        }
    }
    pub fn notify_lq_start(&mut self, collection_name: &str, filter: &Filter, stream_id: Uuid, change_listener: LQChangeListener<'a>) {
        let lq_key = get_lq_key(collection_name, &filter);
        let default = LQEntry::new(collection_name.to_owned(), filter.clone());
        let entry = self.live_queries.entry(lq_key).or_insert(default);
        //entry.watcher_count += 1;
        entry.change_listeners.insert(stream_id, change_listener);
        println!("LQ started. @count:{} @collection:{} @filter:{:?}", entry.change_listeners.len(), collection_name, filter);
    }
    pub fn notify_lq_end(&mut self, collection_name: &str, filter: &Filter, stream_id: Uuid) {
        let lq_key = get_lq_key(collection_name, filter);
        let entry = self.live_queries.get_mut(&lq_key).unwrap();
        entry.change_listeners.remove(&stream_id);
        let new_listeners_length = entry.change_listeners.len();
        if new_listeners_length <= 0 {
            self.live_queries.remove(&lq_key);
        }
        println!("LQ ended. @count:{} @collection:{} @filter:{:?}", new_listeners_length, collection_name, filter);
    }
}
pub fn get_lq_key(collection_name: &str, filter: &Filter) -> String {
    //format!("@collection:{} @filter:{:?}", collection_name, filter)
    json!({
        "collection": collection_name,
        "filter": filter,
    }).to_string()
}

fn arcs_eq<T: ?Sized>(left: &Arc<T>, right: &Arc<T>) -> bool {
    let left : *const T = left.as_ref();
    let right : *const T = right.as_ref();
    left == right
}

#[derive(Default)]
pub struct LQEntry<'a> {
    pub collection_name: String,
    pub filter: Filter,
    //watcher_count: i32,
    pub last_entries: Vec<JSONValue>,
    pub change_listeners: HashMap<Uuid, LQChangeListener<'a>>,
}
impl<'a> LQEntry<'a> {
    pub fn new(collection_name: String, filter: Filter) -> Self {
        Self { collection_name, filter, ..Default::default() }
    }
}