use crate::gql::_general::{MutationShard_General, QueryShard_General, SubscriptionShard_General};
use crate::store::storage::AppStateArc;
use crate::utils::type_aliases::{ABReceiver, ABSender};
use crate::GeneralMessage;
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::Extension;
use axum::extract::{FromRequest, WebSocketUpgrade};
use axum::http::header::CONTENT_TYPE;
use axum::http::{self, uri::Uri, Request, Response, StatusCode};
use axum::http::{HeaderValue, Method};
use axum::response::{self, IntoResponse};
use axum::routing::{get, on_service, post, MethodFilter};
use axum::Error;
use axum::{extract, Router};
use deadpool_postgres::{Manager, Pool};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, FutureExt, Sink, SinkExt, StreamExt, TryFutureExt, TryStreamExt};
use rust_shared::async_graphql::futures_util::task::{Context, Poll};
use rust_shared::async_graphql::http::{graphiql_source, playground_source, GraphQLPlaygroundConfig};
use rust_shared::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use rust_shared::async_graphql::{self, Data, EmptyMutation, EmptySubscription, MergedObject, MergedSubscription, ObjectType, Result, Schema, SubscriptionType, Variables};
use rust_shared::async_graphql_axum::{GraphQLBatchRequest, GraphQLProtocol, GraphQLRequest, GraphQLResponse, GraphQLSubscription, GraphQLWebSocket};
use rust_shared::bytes::Bytes;
use rust_shared::flume::{unbounded, Receiver, Sender};
use rust_shared::hyper::header::CONTENT_LENGTH;
use rust_shared::rust_macros::{wrap_agql_schema_build, wrap_agql_schema_type, wrap_async_graphql, wrap_slow_macros};
use rust_shared::tokio_postgres::Client;
use rust_shared::url::Url;
use rust_shared::utils::db::agql_ext::gql_general_extension::CustomExtensionCreator;
use rust_shared::utils::net::{body_to_str, AxumBody};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{axum, serde_json, tower, tower_http};
use std::borrow::Cow;
use std::collections::HashMap;
use std::convert::Infallible;
use std::env;
use std::future::Future;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::{convert::TryFrom, net::SocketAddr};
use tower::make::Shared;
use tower::{service_fn, BoxError, Service, ServiceExt};

wrap_slow_macros! {

#[derive(MergedObject, Default)]
pub struct QueryRoot(
	QueryShard_General,
);

#[derive(MergedObject, Default)]
pub struct MutationRoot(
	MutationShard_General,
);

#[derive(MergedSubscription, Default)]
pub struct SubscriptionRoot(
	SubscriptionShard_General,
);

}

pub type RootSchema = wrap_agql_schema_type! {
	Schema<QueryRoot, MutationRoot, SubscriptionRoot>
};

/*async fn graphiql() -> impl IntoResponse {
	// use the DEV/PROD value from the "ENVIRONMENT" env-var, to determine what the app-server's URL is (maybe temp)
	let app_server_host = if env::var("ENVIRONMENT").unwrap_or("DEV".to_owned()) == "DEV" { "localhost:5100" } else { "debates.app" };
	response::Html(graphiql_source("/graphql", Some(&format!("wss://{app_server_host}/app-server/graphql"))))
}*/
async fn graphql_playground() -> impl IntoResponse {
	response::Html(playground_source(GraphQLPlaygroundConfig::new("/app-server/graphql").subscription_endpoint("/app-server/graphql")))
}

/*async fn graphql_handler(schema: Extension<RootSchema>, req: GraphQLRequest) -> GraphQLResponse {
	schema.execute(req.into_inner()).await.into()
}*/

pub async fn have_own_graphql_handle_request(req: Request<AxumBody>, schema: RootSchema) -> String {
	// read request's body (from frontend)
	let req_as_str: String = body_to_str(req.into_body()).await.unwrap();
	let req_as_json = JSONValue::from_str(&req_as_str).unwrap();

	// prepare request for graphql engine
	//let gql_req = async_graphql::Request::new(req_as_str);
	let gql_req = async_graphql::Request::new(req_as_json["query"].as_str().unwrap());
	let gql_req = match req_as_json["operationName"].as_str() {
		Some(op_name) => gql_req.operation_name(op_name),
		None => gql_req,
	};
	let gql_req = gql_req.variables(Variables::from_json(req_as_json["variables"].clone()));

	// send request to graphql engine, and read response
	let gql_response = schema.execute(gql_req).await;
	//let response_body: String = gql_response.data.to_string(); // this doesn't output valid json (eg. no quotes around keys)
	let response_str: String = serde_json::to_string(&gql_response).unwrap();

	response_str
}
pub async fn graphql_handler(Extension(schema): Extension<RootSchema>, req: Request<AxumBody>) -> Response<AxumBody> {
	let response_str = have_own_graphql_handle_request(req, schema).await;

	// send response (to frontend)
	let mut response = Response::builder().body(axum::body::Body::from(response_str)).unwrap();
	response.headers_mut().append(CONTENT_TYPE, HeaderValue::from_static("content-type: application/json; charset=utf-8"));
	return response;
}

pub async fn extend_router(
	app: Router,
	msg_sender: ABSender<GeneralMessage>,
	msg_receiver: ABReceiver<GeneralMessage>,
	//msg_sender_test: Sender<GeneralMessage_Flume>, msg_receiver_test: Receiver<GeneralMessage_Flume>,
	app_state: AppStateArc,
) -> Router {
	let schema = wrap_agql_schema_build! {
		Schema::build(QueryRoot::default(), MutationRoot::default(), SubscriptionRoot::default())
	}
	.data(msg_sender)
	.data(msg_receiver)
	/*.data(msg_sender_test)
	.data(msg_receiver_test)*/
	.data(app_state)
	.extension(CustomExtensionCreator)
	.finish();

	let gql_subscription_service = GraphQLSubscription::new(schema.clone());

	let result = app
		//.route("/graphiql", get(graphiql))
		.route("/gql-playground", get(graphql_playground))
		.route("/graphql", on_service(MethodFilter::GET, gql_subscription_service).post(graphql_handler))
		.layer(Extension(schema));

	result
}
