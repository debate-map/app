use std::convert::Infallible;
use std::net::{IpAddr, Ipv4Addr};
use std::str::FromStr;
use anyhow::{anyhow, Error};
use axum::body::HttpBody;
use hyper::server::conn::AddrStream;
use hyper::{client::HttpConnector, Body, Server, StatusCode};
use hyper::client::{Client};
use hyper::service::{service_fn, make_service_fn};
use axum::extract::{FromRequest, RequestParts, Extension};
use axum::http::{Method, HeaderValue};
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router, Json};
use axum::http::{uri::Uri, Request, Response};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription, Variables};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use serde_json::json;
use tracing::info;
use url::Url;
use std::{convert::TryFrom, net::SocketAddr};
use tower_http::cors::{CorsLayer, Origin};
use futures::future::{self, Future};

use crate::gql::RootSchema;
use crate::utils::general::general::body_to_str;
use crate::utils::http::clone_request;
use crate::utils::type_aliases::JSONValue;

pub type HyperClient = hyper::client::Client<HttpConnector, Body>;

pub const APP_SERVER_JS_URL: &str = "http://dm-app-server-js.default.svc.cluster.local:5115";

pub async fn have_own_graphql_handle_request(req: Request<Body>, schema: RootSchema) -> Result<String, Error> {
    // read request's body (from frontend)
    let req_as_str = body_to_str(req.into_body()).await?;
    let req_as_json = JSONValue::from_str(&req_as_str)?;

    // send request to graphql engine
    //let gql_req = async_graphql::Request::new(req_as_str);
    let gql_req = async_graphql::Request::new(req_as_json["query"].as_str().ok_or(anyhow!("The \"query\" field must be a string."))?);
    let gql_req = match req_as_json["operationName"].as_str() {
        Some(op_name) => gql_req.operation_name(op_name),
        None => gql_req,
    };
    let gql_req = gql_req.variables(Variables::from_json(req_as_json["variables"].clone()));

    // read response from graphql engine
    let gql_response = schema.execute(gql_req).await;
    //let response_body: String = gql_response.data.to_string(); // this doesn't output valid json (eg. no quotes around keys)
    let response_str: String = serde_json::to_string(&gql_response)?;
    
    Ok(response_str)
}

pub async fn maybe_proxy_to_asjs_handler(Extension(client): Extension<HyperClient>, Extension(schema): Extension<RootSchema>, req: Request<Body>) -> Response<Body> {
    let mut proxy_request_to_asjs = true;
    
    // if client is on the "/gql-playground" or "/graphiql-new" pages, don't proxy the request to app-server-js
    if let Some(referrer) = req.headers().get("Referer") {
        let referrer_str = &String::from_utf8_lossy(referrer.as_bytes());
        let referrer_url = Url::parse(referrer_str);
        if let Ok(referrer_url) = referrer_url {
            let path = referrer_url.path();
            if path == "/gql-playground" || path == "/graphiql-new" {
                info!(r#"Sending "/graphql" request to app-server-rs, since from "{path}". @referrer:{referrer_str}"#);
                proxy_request_to_asjs = false;
            }
        }
    }
    
    let (mut req, req2) = clone_request(req).await;
    let body_as_str = body_to_str(req2.into_body()).await.unwrap();
    // if request is running one of the commands that's already been rewritten in app-server-rs, don't proxy the request to app-server-js
    if body_as_str.contains("transferNodes(payload: $payload)") {
        proxy_request_to_asjs = false;
    }

    // if not proxying to app-server-js, then send the request to the GraphQL component of this app-server-rs
    if !proxy_request_to_asjs {
        let response_str = match have_own_graphql_handle_request(req, schema).await {
            Ok(a) => a,
            Err(err) => format!("Got error in passing/execution of graphql request to app-server-rs' gql engine:{err:?}"),
        };

        // send response (to frontend)
        let mut response = Response::builder().body(axum::body::Body::from(response_str)).unwrap();
        response.headers_mut().append(CONTENT_TYPE, HeaderValue::from_static("content-type: application/json; charset=utf-8"));
        return response;
    }


    let path = req.uri().path();
    let path_query = req
        .uri()
        .path_and_query()
        .map_or(path, |v| v.as_str());

    //let uri = format!("http://127.0.0.1:5115{}", path_query);
    let uri = format!("{}{}", APP_SERVER_JS_URL, path_query);

    *req.uri_mut() = Uri::try_from(uri).unwrap();

    match client.request(req).await {
        Ok(response) => response,
        // one example of why this can fail: if the app-server-js pod crashed
        Err(err) => {
            // send response as json, since the caller will be expecting json
            let json = json!({
                "error": format!("Error occurred while trying to send get/post command to app-server-js:{}", err),
            });
            Response::builder().status(StatusCode::BAD_GATEWAY)
                .body(Body::from(json.to_string())).unwrap()
            /*Json(json!({
                "error": format!("Error occurred while trying to send get/post command to app-server-js:{}", err),
            }))*/
        },
    }
}