use std::convert::Infallible;
use std::net::{IpAddr, Ipv4Addr};
use std::str::FromStr;
use rust_shared::anyhow::{anyhow, Error, bail, ensure};
use rust_shared::axum::extract::Path;
use rust_shared::domains::DomainsConstants;
use rust_shared::itertools::Itertools;
use rust_shared::reqwest::header::SET_COOKIE;
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

/// Endpoint needed to workaround cross-domain cookie restrictions, for when monitor-client is served by webpack.
/// See CookieTransferHelper.tsx for the client-side handling of the exchange.
pub async fn store_admin_key_cookie(_req: Request<Body>) -> Response<Body> {
    let response_result: Result<_, Error> = try {
        if !DomainsConstants::new().on_server_and_dev { Err(anyhow!("Can only use this helper in a dev cluster."))?; }

        let response = Response::builder()
            .header(CONTENT_TYPE, "text/html; charset=utf-8")
            .body(Body::from(r#"<html><head><script>
                window.addEventListener('message', e=>{
                    if (e.origin !== 'http://localhost:5131') return;
                    if (e.data.adminKey != null) {
                        document.cookie = "adminKey=" + window.btoa(e.data.adminKey);
                        top.postMessage({adminKeyStored: true}, 'http://localhost:5131');
                    }
                }, false);
                top.postMessage({readyForAdminKey: true}, 'http://localhost:5131');
            </script></head></html>"#))
            .unwrap();
        response
    };
    match response_result {
        Ok(response) => response,
        Err(err) => {
            let response_json = json!({ "error": format!("Error occurred. @error:{}", err) });
            let response = Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                //.header(CONTENT_TYPE, "text/html; charset=utf-8")
                .header(CONTENT_TYPE, "application/json; charset=utf-8")
                .body(Body::from(response_json.to_string()))
                .unwrap();
            response
        }
    }
}

pub fn get_admin_key_from_proxy_request(req: &Request<Body>) -> Result<String, Error> {
    // use cookies (instead of eg. an "admin-key" header) so the key gets sent with every proxy-request (ie. from the proxied page loading its subresources)
    if let Some(cookie_str) = req.headers().get("cookie") {
        let cookie_entries = cookie_str.to_str()?.split("; ").collect_vec();
        for cookie_entry in cookie_entries {
            let (cookie_name, cookie_value) = cookie_entry.split_once("=").ok_or(anyhow!("Invalid cookie-str"))?;
            if cookie_name == "adminKey" {
                let admin_key_base64 = cookie_value;
                let admin_key = String::from_utf8(base64::decode(admin_key_base64)?)?;
                return Ok(admin_key);
            }
        }
    }
    bail!("A \"cookie\" header must be provided, with an \"adminKey\" cookie.");
}

pub async fn maybe_proxy_to_prometheus(Extension(client): Extension<HyperClient>, req: Request<Body>) -> Response<Body> {
    let response_result: Result<_, Error> = try {
        let admin_key = get_admin_key_from_proxy_request(&req)?;
        ensure_admin_key_is_correct(admin_key, true)?;
        proxy_to_service_at_port(client, req, PROMETHEUS_URL.to_owned()).await?
    };
    finalize_proxy_response(response_result, "prometheus").await
}
pub async fn maybe_proxy_to_alertmanager(Extension(client): Extension<HyperClient>, req: Request<Body>) -> Response<Body> {
    let response_result: Result<_, Error> = try {
        let admin_key = get_admin_key_from_proxy_request(&req)?;
        ensure_admin_key_is_correct(admin_key, true)?;
        proxy_to_service_at_port(client, req, ALERTMANAGER_URL.to_owned()).await?
    };
    finalize_proxy_response(response_result, "alertmanager").await
}

async fn finalize_proxy_response(response_result: Result<Response<Body>, Error>, service_name: &str) -> Response<Body> {
    match response_result {
        Ok(response) => response,
        Err(err) => {
            let response_json = json!({ "error": format!("Error occurred during setup of proxy to {} service. @error:{}", service_name, err) });
            let response = Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header(CONTENT_TYPE, "application/json; charset=utf-8")
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
    let path_and_query_fixed = format!("/{}", path_and_query.split("/").skip(3).join("/"));

    //let uri = format!("http://127.0.0.1:{}{}", port, path_query);
    //let uri = format!("{}{}", APP_SERVER_JS_URL, path_query);
    let uri = format!("{}{}", uri_base, path_and_query_fixed);
    //println!("Sending proxy request to:{}", uri);

    *req.uri_mut() = Uri::try_from(uri.clone())?;

    match client.request(req).await {
        Ok(response) => Ok(response),
        // one example of why this can fail: if the target pod crashed
        Err(err) => {
            let json = json!({ "error": format!("Error occurred while trying to send get command to pod at uri \"{}\":{}", uri, err) });
            Ok(Response::builder().status(StatusCode::BAD_GATEWAY)
                .header(CONTENT_TYPE, "application/json; charset=utf-8")
                .body(Body::from(json.to_string()))?)
        },
    }
}