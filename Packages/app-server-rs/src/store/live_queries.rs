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
use tokio::sync::{broadcast, mpsc, Mutex, RwLock, RwLockWriteGuard};
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

use crate::utils::db::filter::{entry_matches_filter, QueryFilter};
use crate::utils::db::handlers::json_maps_to_typed_entries;
use crate::utils::db::postgres_parsing::LDChange;
use crate::utils::db::queries::{get_entries_in_collection};
use crate::utils::general::general::rw_locked_hashmap__get_entry_or_insert_with;
use crate::utils::mtx::mtx::{Mtx, new_mtx};
use crate::utils::type_aliases::JSONValue;

use super::live_queries_::lq_group::{LQGroup, get_lq_group_key, filter_shape_from_filter};
use super::live_queries_::lq_instance::LQEntryWatcher;

pub enum DropLQWatcherMsg {
    Drop_ByCollectionAndFilterAndStreamID(String, QueryFilter, Uuid),
}

pub type LQStorageWrapper = Arc<LQStorage>;
//pub type LQStorageWrapper = Arc<RwLock<LQStorage>>;
//#[derive(Default)]

pub struct LQStorage {
    pub query_groups: RwLock<HashMap<String, Arc<LQGroup>>>,
    pub channel_for_lq_watcher_drops__sender_base: Sender<DropLQWatcherMsg>,
    pub channel_for_lq_watcher_drops__receiver_base: Receiver<DropLQWatcherMsg>,
}
impl LQStorage {
    fn new() -> Self {
        let (s1, r1): (Sender<DropLQWatcherMsg>, Receiver<DropLQWatcherMsg>) = flume::unbounded();
        Self {
            query_groups: RwLock::new(HashMap::new()),
            channel_for_lq_watcher_drops__sender_base: s1,
            channel_for_lq_watcher_drops__receiver_base: r1,
        }
    }
    pub fn new_in_wrapper() -> LQStorageWrapper {
        let storage = Self::new();
        let wrapper = LQStorageWrapper::new(storage);

        // start this listener for drop requests
        let wrapper_clone = wrapper.clone();
        tokio::spawn(async move {
            loop {
                let drop_msg = wrapper_clone.channel_for_lq_watcher_drops__receiver_base.recv_async().await.unwrap();
                match drop_msg {
                    DropLQWatcherMsg::Drop_ByCollectionAndFilterAndStreamID(table_name, filter, stream_id) => {
                        let query_group = wrapper_clone.get_or_create_query_group(&table_name, &filter).await;
                        query_group.drop_lq_watcher(&table_name, &filter, stream_id).await;
                    },
                };
            }
        });

        wrapper
    }

    pub async fn get_or_create_query_group(&self, table_name: &str, filter: &QueryFilter) -> Arc<LQGroup> {
        let key = get_lq_group_key(table_name, filter);
        let filter_shape = filter_shape_from_filter(filter);
        rw_locked_hashmap__get_entry_or_insert_with(&self.query_groups, key, || {
            Arc::new(LQGroup::new(table_name.to_owned(), filter_shape))
        }).await.0
    }

    /// Called from pgclient.rs
    pub async fn notify_of_ld_change(&self, change: &LDChange) {
        let query_groups = self.query_groups.read().await;
        for group in query_groups.values() {
            group.notify_of_ld_change(change).await;
        }
    }

    /// Called from handlers.rs
    pub async fn start_lq_watcher<'a, T: From<Row> + Serialize + DeserializeOwned>(&self, table_name: &str, filter: &QueryFilter, stream_id: Uuid, ctx: &async_graphql::Context<'_>, parent_mtx: Option<&Mtx>) -> (Vec<T>, LQEntryWatcher) {
        new_mtx!(mtx, "1", parent_mtx);
        let group = self.get_or_create_query_group(table_name, filter).await;
        group.start_lq_watcher(table_name, filter, stream_id, ctx, Some(&mtx)).await
    }
}