use std::borrow::Cow;
use std::collections::HashMap;
use std::convert::Infallible;
use std::env;
use std::future::Future;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use rust_shared::async_graphql::http::{playground_source, GraphQLPlaygroundConfig, graphiql_source};
use rust_shared::async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType, EmptyMutation, EmptySubscription, Variables, self};
use rust_shared::bytes::Bytes;
use deadpool_postgres::{Pool, Manager};
use rust_shared::hyper::header::CONTENT_LENGTH;
use rust_shared::rust_macros::{wrap_async_graphql, wrap_agql_schema_build, wrap_slow_macros, wrap_agql_schema_type};
use rust_shared::tokio_postgres::{Client};
use rust_shared::utils::db::agql_ext::gql_general_extension::CustomExtensionCreator;
use rust_shared::utils::net::{body_to_str, AxumBody};
use rust_shared::utils::type_aliases::JSONValue;
use tower::make::Shared;
use tower::{Service, ServiceExt, BoxError, service_fn};
use rust_shared::async_graphql::futures_util::task::{Context, Poll};
use rust_shared::async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use rust_shared::{axum, tower, tower_http, serde_json};
use axum::http::{Method, HeaderValue};
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, Router};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, WebSocketUpgrade};
use axum::http::{self, uri::Uri, Request, Response, StatusCode};
use axum::Error;
use axum::{
    extract::Extension,
};
use rust_shared::url::Url;
use std::{convert::TryFrom, net::SocketAddr};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, StreamExt, FutureExt, TryFutureExt, TryStreamExt};
use crate::{GeneralMessage};
use crate::gql::_general::{MutationShard_General, QueryShard_General, SubscriptionShard_General};
use crate::store::storage::AppStateArc;
use crate::utils::type_aliases::{ABSender, ABReceiver};
use rust_shared::async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription, GraphQLProtocol, GraphQLWebSocket, GraphQLBatchRequest};
use rust_shared::flume::{Sender, Receiver, unbounded};

wrap_slow_macros!{

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

pub type RootSchema = wrap_agql_schema_type!{
    Schema<QueryRoot, MutationRoot, SubscriptionRoot>
};

/*async fn graphiql() -> impl IntoResponse {
    // use the DEV/PROD value from the "ENVIRONMENT" env-var, to determine what the app-server's URL is (maybe temp)
    let app_server_host = if env::var("ENVIRONMENT").unwrap_or("DEV".to_owned()) == "DEV" { "localhost:5110" } else { "debates.app/app-server" };
    response::Html(graphiql_source("/graphql", Some(&format!("wss://{app_server_host}/graphql"))))
}*/
async fn graphql_playground() -> impl IntoResponse {
    response::Html(playground_source(
        GraphQLPlaygroundConfig::new("/graphql").subscription_endpoint("/graphql"),
    ))
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
    msg_sender: ABSender<GeneralMessage>, msg_receiver: ABReceiver<GeneralMessage>,
    //msg_sender_test: Sender<GeneralMessage_Flume>, msg_receiver_test: Receiver<GeneralMessage_Flume>,
    app_state: AppStateArc
) -> Router {
    let schema =
        wrap_agql_schema_build!{
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