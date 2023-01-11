use std::convert::Infallible;
use std::net::{IpAddr, Ipv4Addr};
use std::str::FromStr;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::axum::extract::Path;
use rust_shared::itertools::Itertools;
use rust_shared::{futures, axum, tower, tower_http, async_graphql_axum, base64};
use axum::body::HttpBody;
use rust_shared::hyper::server::conn::AddrStream;
use rust_shared::hyper::{client::HttpConnector, Body, Server, StatusCode};
use rust_shared::hyper::client::{Client};
use rust_shared::hyper::service::{service_fn, make_service_fn};
use axum::extract::{FromRequest, RequestParts, Extension};
use axum::http::{Method, HeaderValue};
use axum::http::header::CONTENT_TYPE;
use axum::response::{self, IntoResponse};
use axum::routing::{get, post, MethodFilter, on_service};
use axum::{extract, Router, Json};
use axum::http::{uri::Uri, Request, Response};
use rust_shared::async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use rust_shared::async_graphql::{Schema, MergedObject, MergedSubscription, Variables, self};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use rust_shared::serde_json::{json, self};
use rust_shared::utils::type_aliases::JSONValue;
use tracing::info;
use rust_shared::url::Url;
use std::{convert::TryFrom, net::SocketAddr};
use tower_http::cors::{CorsLayer, Origin};
use futures::future::{self, Future};

use crate::gql::_general::ensure_admin_key_is_correct;

pub type HyperClient = rust_shared::hyper::client::Client<HttpConnector, Body>;

pub const PROMETHEUS_URL: &str = "http://loki-stack-prometheus-server.monitoring.svc.cluster.local:80"; //:9090";
pub const ALERTMANAGER_URL: &str = "http://loki-stack-prometheus-alertmanager.monitoring.svc.cluster.local:80"; //:9093";

pub async fn maybe_proxy_to_prometheus(Extension(client): Extension<HyperClient>, req: Request<Body>, /*Path(admin_key_base64): Path<String>*/) -> Response<Body> {
    let response_result: Result<_, Error> = try {
        let admin_key_base64 = req.uri().path().split("/").nth(3).ok_or(anyhow!("Could not find admin-key segment in uri path."))?;
        let admin_key = String::from_utf8(base64::decode(admin_key_base64)?)?;
        ensure_admin_key_is_correct(admin_key, true)?;
        
        //proxy_to_service_at_port(client, req, 9090).await?
        proxy_to_service_at_port(client, req, PROMETHEUS_URL.to_owned()).await?
    };
    match response_result {
        Ok(response) => response,
        Err(err) => {
            let response_json = json!({
                "error": format!("Error occurred during setup of proxy to prometheus service. @error:{}", err),
            });
            let response = Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header(CONTENT_TYPE, "application/json")
                .body(Body::from(response_json.to_string()))
                .unwrap();
            response
        }
    }
}
pub async fn maybe_proxy_to_alertmanager(Extension(client): Extension<HyperClient>, req: Request<Body>, /*Path(admin_key_base64): Path<String>*/) -> Response<Body> {
    let response_result: Result<_, Error> = try {
        let admin_key_base64 = req.uri().path().split("/").nth(3).ok_or(anyhow!("Could not find admin-key segment in uri path."))?;
        let admin_key = String::from_utf8(base64::decode(admin_key_base64)?)?;
        ensure_admin_key_is_correct(admin_key, true)?;
        
        //proxy_to_service_at_port(client, req, 9093).await?
        proxy_to_service_at_port(client, req, ALERTMANAGER_URL.to_owned()).await?
    };
    match response_result {
        Ok(response) => response,
        Err(err) => {
            let response_json = json!({
                "error": format!("Error occurred during setup of proxy to alertmanager service. @error:{}", err),
            });
            let response = Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header(CONTENT_TYPE, "application/json")
                .body(Body::from(response_json.to_string()))
                .unwrap();
            response
        }
    }
}

pub async fn proxy_to_service_at_port(client: HyperClient, mut req: Request<Body>, uri_base: String) -> Result<Response<Body>, Error> {
    let path = req.uri().path();
    let path_and_query = req
        .uri()
        .path_and_query()
        .map_or(path, |v| v.as_str());
    let path_and_query_fixed = format!("/{}", path_and_query.split("/").skip(4).join("/"));

    //let uri = format!("http://127.0.0.1:{}{}", port, path_query);
    //let uri = format!("{}{}", APP_SERVER_JS_URL, path_query);
    let uri = format!("{}{}", uri_base, path_and_query_fixed);
    println!("Sending proxy request to:{}", uri);

    *req.uri_mut() = Uri::try_from(uri.clone())?;

    match client.request(req).await {
        Ok(response) => Ok(response),
        // one example of why this can fail: if the target pod crashed
        Err(err) => {
            // todo: maybe change this to return an html response rather than json (matches better with caller's expectations)
            let json = json!({
                "error": format!("Error occurred while trying to send get command to pod at uri \"{}\":{}", uri, err),
            });
            Ok(Response::builder().status(StatusCode::BAD_GATEWAY)
                .body(Body::from(json.to_string()))?)
        },
    }
}