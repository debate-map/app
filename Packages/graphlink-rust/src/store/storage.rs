use crate::async_graphql::futures_util::task::{Context, Poll};
use crate::async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use crate::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use crate::async_graphql::{self, Data, MergedObject, MergedSubscription, ObjectType, Result, Schema, SubscriptionType};
use crate::flume::{unbounded, Receiver, Sender};
use crate::hyper::Uri;
use crate::serde::de::DeserializeOwned;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::{json, Map};
use crate::tokio::sync::{mpsc, Mutex, RwLock};
use crate::tokio_postgres::{Client, Row};
use crate::utils::general::type_aliases::{DBPool, TBReceiver, TBSender};
use crate::uuid::Uuid;
use crate::{axum, create_db_pool, futures, tower, tower_http, ProcessMessage};
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

use super::live_queries::{LQStorage, LQStorageArc};

#[derive(Clone, Debug)]
pub enum SignInMsg {
	GotCallbackData(Uri),
}

// todo: maybe merge all this data into the Config struct (based on once_cell)

pub type AppStateArc = Arc<AppState>;
pub struct AppState {
	pub db_pool: Arc<DBPool>,

	pub channel_for_sign_in_messages__sender_base: TBSender<SignInMsg>,
	// KEEP THIS COMMENTED; we want the initial receiver to immediately be dropped, otherwise its staying alive but never reading the channel-messages causes them to pile up, causing a memory leak
	//pub channel_for_sign_in_messages__receiver_base: ABReceiver<SignInMsg>,
	pub channel_for_process_messages__sender_base: TBSender<ProcessMessage>,

	pub live_queries: LQStorageArc,
}
impl AppState {
	fn new() -> Self {
		let (s1, _r1): (TBSender<SignInMsg>, TBReceiver<SignInMsg>) = tokio::sync::broadcast::channel(1000);
		let (s2, _r2): (TBSender<ProcessMessage>, TBReceiver<ProcessMessage>) = tokio::sync::broadcast::channel(1000);
		let db_pool = Arc::new(create_db_pool());
		Self {
			db_pool: db_pool.clone(),
			channel_for_sign_in_messages__sender_base: s1,
			//channel_for_sign_in_messages__receiver_base: r1,
			channel_for_process_messages__sender_base: s2,
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
