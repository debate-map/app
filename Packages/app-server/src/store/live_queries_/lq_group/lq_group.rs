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
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::mtx::mtx::Mtx;
use rust_shared::{futures, axum, tower, tower_http, Lock, check_lock_order, flume, new_mtx};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use rust_shared::flume::{Sender, Receiver, unbounded};
use rust_shared::indexmap::IndexMap;
use rust_shared::itertools::Itertools;
use rust_shared::utils::type_aliases::{JSONValue, FReceiver, FSender};
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

use crate::store::live_queries_::lq_key::LQKey;
use crate::utils::db::filter::{entry_matches_filter, QueryFilter, FilterOp};
use crate::utils::db::handlers::json_maps_to_typed_entries;
use crate::utils::db::pg_stream_parsing::{LDChange};
use crate::utils::db::queries::{get_entries_in_collection};
use crate::utils::general::general::{AtomicF64};
use crate::utils::type_aliases::{PGClientObject, ABReceiver, ABSender, DBPoolArc};

use super::lq_group_impl::{LQGroupImpl, LQBatchMessage};
use super::super::lq_instance::{LQInstance, LQEntryWatcher};

type RwLock_Std<T> = std::sync::RwLock<T>;

pub enum LQGroup_InMsg {
    //AddLQInstance(Arc<LQInstance>),
    //RemoveLQInstance(String),
    //NotifyBatchExecutionDone(usize),
    //NotifyBatchCommitted(usize),
    GetInitializedLQInstanceForKey(LQKey, Option<Mtx>),
    DropLQWatcher(LQKey, Uuid),
    NotifyOfLDChange(LDChange),
    /// (entry_id [ie. row uuid])
    RefreshLQDataForX(String),
}
#[derive(Clone)]
pub enum LQGroup_OutMsg {
    //NotifyBatchExecutionDone(usize),
    //NotifyBatchCommitted(usize),
    /// (lq_key, lqi, just_initialized)
    LQInstanceIsInitialized(LQKey, Arc<LQInstance>, bool)
}

pub struct LQGroup {
    inner: Mutex<LQGroupImpl>,

    pub lq_key: LQKey,
    messages_in_sender: FSender<LQGroup_InMsg>,
    messages_in_receiver: FReceiver<LQGroup_InMsg>,
    messages_out_sender: ABSender<LQGroup_OutMsg>,
    messages_out_receiver: ABReceiver<LQGroup_OutMsg>,
}
impl LQGroup {
    fn new(lq_key: LQKey, db_pool: DBPoolArc) -> Self {
        let (s1, r1): (FSender<LQGroup_InMsg>, FReceiver<LQGroup_InMsg>) = flume::unbounded();
        let (mut s2, r2): (ABSender<LQGroup_OutMsg>, ABReceiver<LQGroup_OutMsg>) = async_broadcast::broadcast(1000);

        // nothing ever "consumes" the messages in the `messages_out` channel, so we must enable overflow (ie. deletion of old entries once queue-size cap is reached)
        s2.set_overflow(true);

        //let lq_key = LQKey::new(table_name, filter);
        let new_self = Self {
            inner: Mutex::new(LQGroupImpl::new(lq_key.clone(), db_pool)),

            lq_key,
            messages_in_sender: s1,
            messages_in_receiver: r1,
            messages_out_sender: s2,
            messages_out_receiver: r2,
        };

        new_self
    }
    pub fn new_in_arc(lq_key: LQKey, db_pool: DBPoolArc) -> Arc<Self> {
        let wrapper = Arc::new(Self::new(lq_key, db_pool));

        tokio::spawn(Self::message_loop(wrapper.clone()));

        wrapper
    }

    // message-handling
    // ==========

    fn send_message(&self, message: LQGroup_InMsg) {
        // unwrap is safe; LQGroup instances are never dropped, so the channel is also never dropped/closed
        self.messages_in_sender.send(message).unwrap();
    }

    async fn message_loop(self: Arc<Self>) {
        loop {
            let message = self.messages_in_receiver.recv_async().await.unwrap();
            let mut inner = self.inner.lock().await;
            match message {
                LQGroup_InMsg::GetInitializedLQInstanceForKey(lq_key, parent_mtx) => {
                    let (lqi, just_initialized) = inner.get_or_create_lq_instance(&lq_key, parent_mtx.as_ref()).await;
                    self.messages_out_sender.broadcast(LQGroup_OutMsg::LQInstanceIsInitialized(lq_key, lqi, just_initialized)).await.unwrap();
                },
                LQGroup_InMsg::DropLQWatcher(lq_key, uuid) => {
                    inner.drop_lq_watcher(&lq_key, uuid).await;
                },
                LQGroup_InMsg::NotifyOfLDChange(change) => {
                    inner.notify_of_ld_change(&change).await;
                },
                LQGroup_InMsg::RefreshLQDataForX(entry_id) => {
                    // ignore error; if db-request fails, we leave it up to user to retry (it's a temporary workaround anyway)
                    let _ = inner.refresh_lq_data_for_x(&entry_id).await;
                },
            }
        }
    }

    // helper functions, for use by external callers/threads (ideally these "simply send a message, and return a value", but if they have processing, it should be kept fast and basic)
    // ==========
    
    pub async fn get_initialized_lqi_for_key(&self, lq_key: &LQKey, mtx_p: Option<Mtx>) -> Arc<LQInstance> {
        let mut new_receiver = self.messages_out_receiver.new_receiver();
        self.send_message(LQGroup_InMsg::GetInitializedLQInstanceForKey(lq_key.clone(), mtx_p));
        loop {
            #[allow(irrefutable_let_patterns)] // needed atm, since only one enum-option defined
            if let LQGroup_OutMsg::LQInstanceIsInitialized(lq_key2, lqi, _just_initialized) = new_receiver.recv().await.unwrap() && lq_key2 == *lq_key {
                return lqi;
            }
        }
    }
    pub async fn start_lq_watcher<'a, T: From<Row> + Serialize + DeserializeOwned>(&self, lq_key: &LQKey, stream_id: Uuid, mtx_p: Option<&Mtx>) -> (Vec<T>, LQEntryWatcher) {
        new_mtx!(mtx, "1:get or create lqi", mtx_p);
        /*new_mtx!(mtx2, "<proxy>", Some(&mtx));
        let lqi = self.get_initialized_lqi_for_key(&lq_key, Some(tx2)).await;*/
        let lqi = self.get_initialized_lqi_for_key(&lq_key, Some(mtx.proxy())).await;

        mtx.section("2:get current result-set");
        let result_entries = lqi.last_entries.read().await.clone();

        mtx.section("3:convert result-set to rust types");
        let result_entries_as_type: Vec<T> = json_maps_to_typed_entries(result_entries.clone());

        mtx.section("4:get or create watcher, for the given stream");
        //let watcher = entry.get_or_create_watcher(stream_id);
        let (watcher, _watcher_is_new, new_watcher_count) = lqi.get_or_create_watcher(stream_id, Some(&mtx), result_entries).await;
        let watcher_info_str = format!("@watcher_count_for_entry:{} @collection:{} @filter:{:?}", new_watcher_count, lq_key.table_name, lq_key.filter);
        debug!("LQ-watcher started. {}", watcher_info_str);

        (result_entries_as_type, watcher.clone())
    }

    pub fn drop_lq_watcher(&self, lq_key: LQKey, stream_id: Uuid) {
        self.send_message(LQGroup_InMsg::DropLQWatcher(lq_key, stream_id));
    }
    pub fn notify_of_ld_change(&self, change: LDChange) {
        self.send_message(LQGroup_InMsg::NotifyOfLDChange(change));
    }
    pub fn refresh_lq_data_for_x(&self, entry_id: String) {
        self.send_message(LQGroup_InMsg::RefreshLQDataForX(entry_id));
    }
}