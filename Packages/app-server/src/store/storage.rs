use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, WebSocketUpgrade};
use axum::http::header::CONTENT_TYPE;
use axum::http::Method;
use axum::http::{self, Request, Response, StatusCode};
use axum::response::{self, IntoResponse};
use axum::routing::{get, on_service, post, MethodFilter};
use axum::Error;
use axum::{extract, Router};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, FutureExt, Sink, SinkExt, Stream, StreamExt};
use rust_shared::async_graphql::futures_util::task::{Context, Poll};
use rust_shared::async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use rust_shared::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use rust_shared::async_graphql::{self, Data, MergedObject, MergedSubscription, ObjectType, Result, Schema, SubscriptionType};
use rust_shared::flume::{unbounded, Receiver, Sender};
use rust_shared::hyper::Uri;
use rust_shared::serde::de::DeserializeOwned;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Map};
use rust_shared::tokio::sync::{mpsc, Mutex, RwLock};
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::uuid::Uuid;
use rust_shared::{axum, futures, tower, tower_http};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::convert::Infallible;
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
use std::str::FromStr;
use std::sync::Arc;
use tower::Service;
use tower_http::cors::CorsLayer;

use crate::links::pgclient::create_db_pool;
use crate::utils::type_aliases::{ABReceiver, ABSender, DBPool};

use super::live_queries::{LQStorage, LQStorageArc};

#[derive(Clone, Debug)]
pub enum SignInMsg {
	GotCallbackData(Uri),
}

pub type AppStateArc = Arc<AppState>;
pub struct AppState {
	pub db_pool: Arc<DBPool>,

	pub channel_for_sign_in_messages__sender_base: ABSender<SignInMsg>,
	pub channel_for_sign_in_messages__receiver_base: ABReceiver<SignInMsg>,

	pub live_queries: LQStorageArc,
}
impl AppState {
	fn new() -> Self {
		let (s1, r1): (ABSender<SignInMsg>, ABReceiver<SignInMsg>) = async_broadcast::broadcast(1000);
		let db_pool = Arc::new(create_db_pool());
		Self {
			db_pool: db_pool.clone(),
			channel_for_sign_in_messages__sender_base: s1,
			channel_for_sign_in_messages__receiver_base: r1,
			live_queries: LQStorage::new_in_arc(db_pool.clone()),
		}
	}
	pub fn new_in_arc() -> AppStateArc {
		Arc::new(Self::new())
	}
}

// helpers, for getting some common data out of async-graphql's context-data
pub fn get_app_state_from_gql_ctx<'a>(gql_ctx: &'a async_graphql::Context<'a>) -> &'a AppStateArc {
	let app_state = gql_ctx.data::<AppStateArc>().unwrap();
	app_state
}
