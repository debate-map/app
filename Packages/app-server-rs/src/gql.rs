use std::borrow::Cow;
use std::collections::HashMap;
use std::convert::Infallible;
use std::future::Future;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription, ObjectType, Data, Result, SubscriptionType, EmptyMutation, EmptySubscription, Variables};
use bytes::Bytes;
use hyper::header::CONTENT_LENGTH;
use hyper::{Body, service};
use hyper::client::HttpConnector;
use rust_macros::{wrap_async_graphql, wrap_agql_schema_build, wrap_slow_macros, wrap_agql_schema_type};
use tokio_postgres::{Client};
use tower::make::Shared;
use tower::{Service, ServiceExt, BoxError, service_fn};
use tower_http::cors::{CorsLayer, Origin};
use async_graphql::futures_util::task::{Context, Poll};
use async_graphql::http::{WebSocketProtocols, WsMessage, ALL_WEBSOCKET_PROTOCOLS};
use axum::http::{Method, HeaderValue};
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use axum::body::{boxed, BoxBody, HttpBody};
use axum::extract::ws::{CloseFrame, Message};
use axum::extract::{FromRequest, RequestParts, WebSocketUpgrade};
use axum::http::{self, uri::Uri, Request, Response, StatusCode};
use axum::Error;
use axum::{
    extract::Extension,
};
use url::Url;
use std::{convert::TryFrom, net::SocketAddr};
use futures_util::future::{BoxFuture, Ready};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{future, Sink, SinkExt, StreamExt, FutureExt, TryFutureExt, TryStreamExt};
use crate::db::general::subtree::{QueryShard_General_Subtree};
use crate::utils::type_aliases::JSONValue;
use crate::{get_cors_layer};
use crate::db::_general::{MutationShard_General, QueryShard_General, SubscriptionShard_General};
use crate::db::access_policies::SubscriptionShard_AccessPolicy;
use crate::db::command_runs::SubscriptionShard_CommandRun;
use crate::db::feedback_proposals::SubscriptionShard_Proposal;
use crate::db::feedback_user_infos::SubscriptionShard_UserInfo;
use crate::db::global_data::SubscriptionShard_GlobalData;
use crate::db::map_node_edits::SubscriptionShard_MapNodeEdit;
use crate::db::maps::SubscriptionShard_Map;
use crate::db::medias::SubscriptionShard_Media;
use crate::db::node_child_links::SubscriptionShard_NodeChildLink;
use crate::db::node_phrasings::SubscriptionShard_MapNodePhrasing;
use crate::db::node_ratings::SubscriptionShard_NodeRating;
use crate::db::node_revisions::SubscriptionShard_MapNodeRevision;
use crate::db::node_tags::SubscriptionShard_MapNodeTag;
use crate::db::nodes::SubscriptionShard_MapNode;
use crate::db::shares::SubscriptionShard_Share;
use crate::db::terms::SubscriptionShard_Term;
use crate::db::user_hiddens::{SubscriptionShard_UserHidden};
use crate::db::users::{SubscriptionShard_User};
use crate::proxy_to_asjs::{proxy_to_asjs_handler, HyperClient};
use crate::store::storage::StorageWrapper;
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription, GraphQLProtocol, GraphQLWebSocket, GraphQLBatchRequest};

wrap_slow_macros!{

#[derive(MergedObject, Default)]
pub struct QueryRoot(QueryShard_General, QueryShard_General_Subtree);

#[derive(MergedObject, Default)]
pub struct MutationRoot(MutationShard_General);

#[derive(MergedSubscription, Default)]
pub struct SubscriptionRoot(
    SubscriptionShard_General,
    SubscriptionShard_User, SubscriptionShard_UserHidden,
    SubscriptionShard_GlobalData, SubscriptionShard_Map,
    SubscriptionShard_Term, SubscriptionShard_AccessPolicy, SubscriptionShard_Media,
    SubscriptionShard_CommandRun, SubscriptionShard_Proposal, SubscriptionShard_UserInfo,
    SubscriptionShard_MapNode, SubscriptionShard_NodeChildLink, SubscriptionShard_MapNodeEdit,
    SubscriptionShard_MapNodePhrasing, SubscriptionShard_NodeRating, SubscriptionShard_MapNodeRevision, SubscriptionShard_MapNodeTag,
    SubscriptionShard_Share,
);

}

async fn graphql_playground() -> impl IntoResponse {
    response::Html(playground_source(
        GraphQLPlaygroundConfig::new("/graphql").subscription_endpoint("/graphql"),
    ))
}

pub fn extend_router(app: Router, client: Client, storage_wrapper: StorageWrapper) -> Router {
    let schema =
        wrap_agql_schema_build!{
            Schema::build(QueryRoot::default(), MutationRoot::default(), SubscriptionRoot::default())
        }
        .data(client)
        .data(storage_wrapper)
        //.data(connection)
        .finish();


    let client_to_asjs = HyperClient::new();
    let gql_subscription_service = GraphQLSubscription::new(schema.clone());

    // there is surely a better way to do this conditional-proxying, but this is the only way I know atm
    let graphql_router_layered = Router::new()
        .route("/graphql", post(proxy_to_asjs_handler).on_service(MethodFilter::GET, gql_subscription_service.clone()))
        .layer(AddExtensionLayer::new(schema.clone()))
        .layer(AddExtensionLayer::new(client_to_asjs.clone()));

    let result = app
        .route("/gql-playground", get(graphql_playground))
        .route("/graphql",
            //post(proxy_to_asjs_handler).on_service(MethodFilter::GET, gql_subscription_service)
            /*on_service(MethodFilter::GET, gql_subscription_service)
            .post(proxy_to_asjs_handler)
            .and_then(|res: Body| async move {
                let res_as_str = format!("{:?}", hyper::body::to_bytes(res).await.unwrap());
                println!("Got response from proxy:{}", res_as_str);
                /*if res_as_str.starts_with("404") {
                    return gql_subscription_service();
                }*/
                //res
                gql_subscription_service.call(res)
            })*/
            tower::service_fn({
                let schema2 = schema.clone();
                move |req: Request<Body>| {
                    let req_headers = req.headers().clone();

                    let schema3 = schema2.clone();
                    //let graphql_router_force_regular = graphql_router_force_regular.clone();
                    let graphql_router_layered = graphql_router_layered.clone();
                    async move {
                        // if we're on the "/gql-playground" page, always send the request to the app-server-rs' regular handler (ie. not using the proxy to app-server-js)
                        if let Some(referrer) = req_headers.get("Referer") {
                            let referrer_str = &String::from_utf8_lossy(referrer.as_bytes());
                            let referrer_url = Url::parse(referrer_str);
                            if let Ok(referrer_url) = referrer_url {
                                if referrer_url.path() == "/gql-playground" {
                                    println!(r#"Sending "/graphql" request to force_regular branch. @referrer:{}"#, referrer_str);
                                    //return graphql_router_force_regular.oneshot(req).await.map_err(|err| match err {});

                                    // read request's body (from frontend)
                                    let bytes1 = hyper::body::to_bytes(req.into_body()).await.unwrap();
                                    let req_as_str: String = String::from_utf8_lossy(&bytes1).as_ref().to_owned();
                                    let req_as_json = JSONValue::from_str(&req_as_str).unwrap();
                                    //println!("req_as_str:{}", req_as_str);

                                    // send request to graphql engine
                                    //let gql_req = async_graphql::Request::new(req_as_str);
                                    let gql_req = async_graphql::Request::new(req_as_json["query"].as_str().unwrap());
                                    let gql_req = match req_as_json["operationName"].as_str() {
                                        Some(op_name) => gql_req.operation_name(op_name),
                                        None => gql_req,
                                    };
                                    let gql_req = gql_req.variables(Variables::from_json(req_as_json["variables"].clone()));

                                    // read response from graphql engine
                                    let gql_response = schema3.execute(gql_req).await;
                                    //let response_body: String = gql_response.data.to_string(); // this doesn't output valid json (eg. no quotes around keys)
                                    let response_body: String = serde_json::to_string(&gql_response).unwrap();
                                    
                                    // send response (to frontend)
                                    let mut response = Response::builder()
                                        .body(HttpBody::map_err(axum::body::Body::from(response_body), |e| axum::Error::new("Test")).boxed_unsync())
                                        .unwrap();
                                    response.headers_mut().append(CONTENT_TYPE, HeaderValue::from_static("content-type: application/json; charset=utf-8"));
                                    return Ok(response);
                                };
                            }
                        }
                        
                        println!(r#"Sending "/graphql" request to layered branch"#);
                        graphql_router_layered.oneshot(req).await.map_err(|err| match err {})
                    }
                }
            })
        )

        // for endpoints not defined by app-server-rs (eg. /check-mem), assume it is meant for app-server-js, and thus call the proxying function
        .fallback(get(proxy_to_asjs_handler).merge(post(proxy_to_asjs_handler)))
        .layer(AddExtensionLayer::new(schema))
        .layer(AddExtensionLayer::new(client_to_asjs));

    println!("Playground: http://localhost:8000");
    result
}