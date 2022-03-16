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

/*pub type RootSchema = wrap_agql_schema_type!{
    Schema<QueryRoot, MutationRoot, SubscriptionRoot>
};*/

async fn graphql_playground() -> impl IntoResponse {
    response::Html(playground_source(
        GraphQLPlaygroundConfig::new("/graphql").subscription_endpoint("/graphql"),
    ))
}

/*async fn graphql_handler(schema: Extension<RootSchema>, req: GraphQLRequest) -> GraphQLResponse {
    schema.execute(req.0).await.into()
}

async fn handle<T>(request: hyper::Request<T>) -> Result<Response<&'static str>, Infallible> {
    let response = Response::new("Hello, World!");
    Ok(response)
}*/

pub fn extend_router(app: Router, client: Client, storage_wrapper: StorageWrapper) -> Router {
    let schema =
        wrap_agql_schema_build!{
            Schema::build(QueryRoot::default(), MutationRoot::default(), SubscriptionRoot::default())
        }
        .data(client)
        .data(storage_wrapper)
        //.data(connection)
        .finish();


    /*let app = Router::new()
        .route("/", get(graphql_playground).post(graphql_handler))
        .layer(AddExtensionLayer::new(schema));*/

    let client_to_asjs = HyperClient::new();
    let gql_subscription_service = GraphQLSubscription::new(schema.clone());

    // there is surely a better way to do this conditional-proxying, but this is the only way I know atm
    let graphql_router_layered = Router::new()
        .route("/graphql", post(proxy_to_asjs_handler).on_service(MethodFilter::GET, gql_subscription_service.clone()))
        .layer(AddExtensionLayer::new(schema.clone()))
        .layer(AddExtensionLayer::new(client_to_asjs.clone()));
    /*let graphql_router_force_regular = Router::new()
        .route("/graphql", on_service(MethodFilter::all(), gql_subscription_service.clone()))
        //.route("/graphql", tower::service_fn(handle))
        .layer(AddExtensionLayer::new(schema.clone()))
        .layer(AddExtensionLayer::new(client_to_asjs.clone()));*/

    let schema2 = schema.clone();

    let result = app
        .route("/gql-playground", get(graphql_playground))
        //.route("/graphql", post(gql_post::gqp_post_handler))
        //.route("/graphql", GraphQLSubscription::new(schema.clone()))

        // todo: fix that the subset of POST commands that app-server-rs should be handling, is also currently being proxied to app-server-js
        // eg. POST to http://localhost:3105/graphql, with: {operationName: "IntrospectionQuery", query: "query IntrospectionQuery { ... }", variables: {}}
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
                //let schema3 = schema.clone();
                move |req: Request<Body>| {
                    //let graphql_router_force_regular = graphql_router_force_regular.clone();
                    
                    let req_headers = req.headers().clone();
                    //let req_body = req.body().clone();

                    /*let (parts, body) = req.into_parts();
                    let req_new = clone_request(parts, body, "dsfsdf".to_owned());*/

                    let schema3 = schema2.clone();
                    //let graphql_router_force_regular = graphql_router_force_regular.clone();
                    let graphql_router_layered = graphql_router_layered.clone();
                    async move {
                        /*let test1 = req.extensions().clone();
                        let schema3 = test1.get::<RootSchema>().unwrap();*/

                        //let (req1, req2) = clone_request(req).await;

                        //let mut override_val: Option<String> = None;
                        // if we're on the "/gql-playground" page, always send the request to the app-server-rs' regular handler (ie. not using the proxy to app-server-js)
                        if let Some(referrer) = req_headers.get("Referer") {
                            //let referrer_str = format!("{:?}", referrer); // bad; this adds quotes around the url, within the string
                            let referrer_str = &String::from_utf8_lossy(referrer.as_bytes());
                            //println!("Referrer:{}", referrer_str);
                            let referrer_url = Url::parse(referrer_str);
                            if let Ok(referrer_url) = referrer_url {
                                //println!("Path:{}", referrer_url.path());
                                if referrer_url.path() == "/gql-playground" {
                                    println!("Sending to force_regular branch:{}", referrer_str);
                                    //return StatusCode::NOT_FOUND.into_response();
                                    //gql_subscription_service
                                    //return graphql_router_force_regular.oneshot(req).await.map_err(|err| match err {});
                                    //let req_as_gql = GraphQLRequest::from(req.into_parts().0);
                                    //let args = (*schema_ext, req);
                                    //let response_body = graphql_handler.call(args).await.map_err(|err| match err {});

                                    let bytes1 = hyper::body::to_bytes(req.into_body()).await.unwrap();
                                    let req_as_str: String = String::from_utf8_lossy(&bytes1).as_ref().to_owned();
                                    let req_as_json = JSONValue::from_str(&req_as_str).unwrap();
                                    println!("req_as_str:{}", req_as_str);
                                    //let gql_req = async_graphql::Request::new(req_as_str);
                                    let gql_req = async_graphql::Request::new(req_as_json["query"].as_str().unwrap());
                                    let gql_req = match req_as_json["operationName"].as_str() {
                                        Some(op_name) => gql_req.operation_name(op_name),
                                        None => gql_req,
                                    };
                                    let gql_req = gql_req.variables(Variables::from_json(req_as_json["variables"].clone()));
                                    let gql_response = schema3.execute(gql_req).await;
                                    println!("gql_response:{:?}", gql_response);
                                    //let response_body: String = gql_response.data.to_string();
                                    let response_body: String = serde_json::to_string(&gql_response).unwrap();
                                    println!("response_body:{}", response_body);
                                    
                                    //override_val = Some(response_body);
                                    let mut response = Response::builder()
                                        .body(HttpBody::map_err(axum::body::Body::from(response_body), |e| axum::Error::new("Test")).boxed_unsync())
                                        .unwrap();
                                    response.headers_mut().append(CONTENT_TYPE, HeaderValue::from_static("content-type: application/json; charset=utf-8"));
                                    return Ok(response);
                                };
                            }
                        }
                        
                        println!("Sending to layered branch");
                        /*println!("Sending to layered branch{}", match override_val {
                            Some(_) => " (but then overriding with force_regular result)",
                            None => "",
                        });*/
                        graphql_router_layered.oneshot(req)
                            /*.map_ok(|mut a| {
                                if let Some(override_val) = override_val {
                                    //let temp: Response<UnsyncBoxBody<Bytes, Error>>;
                                    //return temp;
                                    //return axum::body::Body::from("hai").map_err(|e| axum::Error::new("Test")).boxed_unsync();
                                    let override_val_length = override_val.len();
                                    *a.body_mut() = HttpBody::map_err(axum::body::Body::from(override_val), |e| axum::Error::new("Test")).boxed_unsync();

                                    let temp = override_val_length.to_string();
                                    let val = HeaderValue::from_str(&temp).unwrap();
                                    a.headers_mut().insert(CONTENT_LENGTH, val); // content-length header needs to match payload, else "hyper" complains
                                }

                                // *a.body_mut() = axum::body::Body::from("hai").map_err(|e| axum::Error::new("Test")).boxed_unsync();

                                a
                            })*/
                            .await.map_err(|err| match err {})
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

async fn clone_request(req: Request<Body>) -> (Request<Body>, Request<Body>) {
    let (parts, body) = req.into_parts();
    //clone_request_from_parts(parts, body, "sdf".to_owned()).await
    clone_request_from_parts(parts, body).await
}
async fn clone_request_from_parts(
    parts: http::request::Parts, body: hyper::Body,
    // modifications
    //new_url: String
) -> (Request<Body>, Request<Body>) {
    let new_url = parts.uri;

    let entire_body_as_vec = body
        .try_fold(Vec::new(), |mut data, chunk| async move {
            data.extend_from_slice(&chunk);
            Ok(data)
        }).await;

    let body_str = String::from_utf8(entire_body_as_vec.unwrap()).expect("response was not valid utf-8");
    let mut request_builder_1 = Request::builder().uri(new_url.clone()).method(parts.method.as_str());
    let mut request_builder_2 = Request::builder().uri(new_url).method(parts.method.as_str());

    for (header_name, header_value) in parts.headers.iter() {
        request_builder_1 = request_builder_1.header(header_name.as_str(), header_value);
        request_builder_2 = request_builder_2.header(header_name.as_str(), header_value);
    }

    let req1 = request_builder_1
        .body(Body::from(body_str.clone()))
        .unwrap();
    let req2 = request_builder_2
        .body(Body::from(body_str.clone()))
        .unwrap();

    (req1, req2)
}