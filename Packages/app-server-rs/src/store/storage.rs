use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
use std::str::FromStr;
use std::sync::Arc;
use rust_shared::hyper::Uri;
use rust_shared::async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use rust_shared::async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType};
use rust_shared::{futures, axum, tower, tower_http};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use flume::{Sender, Receiver, unbounded};
use rust_shared::serde::de::DeserializeOwned;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Map};
use rust_shared::tokio::sync::{mpsc, Mutex, RwLock};
use rust_shared::tokio_postgres::{Client, Row};
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
use rust_shared::uuid::Uuid;

use crate::utils::type_aliases::{ABSender, ABReceiver};

// todo: merge AppState and LQStorage

#[derive(Clone, Debug)]
pub enum SignInMsg {
    GotCallbackData(Uri),
}

pub type AppStateWrapper = Arc<AppState>;
pub struct AppState {
    pub channel_for_sign_in_messages__sender_base: ABSender<SignInMsg>,
    pub channel_for_sign_in_messages__receiver_base: ABReceiver<SignInMsg>,
}
impl AppState {
    fn new() -> Self {
        let (mut s1, r1): (ABSender<SignInMsg>, ABReceiver<SignInMsg>) = async_broadcast::broadcast(1000);
        Self {
            channel_for_sign_in_messages__sender_base: s1,
            channel_for_sign_in_messages__receiver_base: r1,
        }
    }
    pub fn new_in_wrapper() -> AppStateWrapper {
        let storage = Self::new();
        let wrapper = AppStateWrapper::new(storage);

        // start this listener for drop requests
        /*let wrapper_clone = wrapper.clone();
        tokio::spawn(async move {
            loop {
                let drop_msg = wrapper_clone.channel_for_lq_watcher_drops__receiver_base.recv_async().await.unwrap();
                match drop_msg {
                    SignInMsg::TODO(todo) => {},
                };
            }
        });*/

        wrapper
    }
}