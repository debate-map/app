use std::convert::Infallible;
use std::net::{IpAddr, Ipv4Addr};
use hyper::server::conn::AddrStream;
use hyper::{client::HttpConnector, Body, Server, StatusCode};
use hyper::client::{Client};
use hyper::service::{service_fn, make_service_fn};
use axum::extract::{FromRequest, RequestParts, Extension};
use axum::http::Method;
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, AddExtensionLayer, Router};
use axum::http::{uri::Uri, Request, Response};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{Schema, MergedObject, MergedSubscription};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use serde_json::json;
use std::{convert::TryFrom, net::SocketAddr};
use tower_http::cors::{CorsLayer, Origin};
use crate::gql::RootSchema;
use futures::future::{self, Future};

pub type HyperClient = hyper::client::Client<HttpConnector, Body>;

pub const APP_SERVER_JS_URL: &str = "http://dm-app-server-js.default.svc.cluster.local:3155";

pub async fn proxy_to_asjs_handler(Extension(client): Extension<HyperClient>, mut req: Request<Body>) -> Response<Body> {
    let path = req.uri().path();
    let path_query = req
        .uri()
        .path_and_query()
        .map(|v| v.as_str())
        .unwrap_or(path);

    //let uri = format!("http://127.0.0.1:3155{}", path_query);
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
        },
    }
}