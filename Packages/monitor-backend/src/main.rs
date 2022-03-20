#![feature(backtrace)]
#![feature(fn_traits)]
//#![feature(let_chains)] // commented for now, till there's a Rust 1.60 image that Dockerfile can point to (to have consistent behavior)
//#![feature(unsized_locals)]
//#![feature(unsized_fn_params)]

#![warn(clippy::all, clippy::pedantic, clippy::cargo)]
#![allow(
    unused_imports, // makes refactoring a pain (eg. you comment out a line to test something, and now must scroll-to-top and comment lots of stuff)
    non_camel_case_types,
    non_snake_case, // makes field-names inconsistent with graphql and such, for db-struct fields
    clippy::module_name_repetitions, // too many false positives
    clippy::items_after_statements, // usefulness of custom line-grouping outweighs that of having all-items-before-statements
    clippy::expect_fun_call, // requires manual integration of error-message into the format-str, which is a pain, for usually negligible perf-gains
    clippy::redundant_closure_for_method_calls, // often means substituting a much longer method-id than the closure code itself, reducing readability
    clippy::similar_names, // too many false positives (eg. "req" and "res")
    clippy::must_use_candidate, // too many false positives
    clippy::implicit_clone, // personally, I like ownedString.to_owned(); it works the same way for &str and ownedString, meaning roughly, "Give me a new owned-version, that I can send in, regardless of the source-type."
    clippy::unused_async, // too many false positives (eg. functions that must be async to be sent as an argument to something else, like a web-server library's API)
    clippy::for_kv_map, // there are often cases where the key/value is not *currently* used, but was/will-be-soon, due to just doing a commenting test or something
    clippy::if_not_else, // there are often reasons a dev might want one of the blocks before the other

    // to avoid false-positives, of certain functions, as well as for [Serialize/Deserialize]_Stub macro-usage (wrt private fields)
    dead_code,
)]

use axum::{
    response::{Html},
    routing::{get, any_service, post},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE}
    },
    headers::HeaderName, middleware,
};
use hyper::{server::conn::AddrStream, service::{make_service_fn, service_fn}, Request, Body, Response, StatusCode, header::{FORWARDED, self}};
use tower_http::cors::{CorsLayer, Origin, AnyOr};
use std::{
    collections::HashSet,
    net::{SocketAddr, IpAddr},
    sync::{Arc}, panic, backtrace::Backtrace, convert::Infallible,
};
use tokio::{sync::{broadcast, Mutex}, runtime::Runtime};

/*mod gql;
mod proxy_to_asjs;
mod pgclient;*/

pub fn get_cors_layer() -> CorsLayer {
    // ref: https://docs.rs/tower-http/latest/tower_http/cors/index.html
    CorsLayer::new()
        .allow_origin(Origin::predicate(|_, _| { true })) // must use true (ie. have response's "allowed-origin" always equal the request origin) instead of "*", since we have credential-inclusion enabled
        .allow_methods(vec![
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::HEAD,
            Method::OPTIONS,
            Method::CONNECT,
            Method::PATCH,
            Method::TRACE,
        ])
        .allow_headers(vec![CONTENT_TYPE]) // needed, because the POST requests include a content-type header (which is not on the approved-by-default list)
        .allow_credentials(true)
}

#[tokio::main]
async fn main() {
    panic::set_hook(Box::new(|info| {
        let stacktrace = Backtrace::force_capture();
        println!("Got panic. @info:{}\n@stackTrace:{}", info, stacktrace);
        std::process::abort();
    }));

    let app = Router::new()
        .layer(get_cors_layer())
        /*.route("/", get(|| async { Html(r#"
            <p>This is the URL for monitor-backend.</p>
            <p>Navigate to <a href="https://debatemap.app">debatemap.app</a> instead. (or localhost:5100/localhost:5101, if running Debate Map locally)</p>
        "#) }))*/;

    let addr = SocketAddr::from(([0, 0, 0, 0], 5130)); // ip of 0.0.0.0 means it can receive connections from outside this pod (eg. other pods, the load-balancer)
    let server_fut = axum::Server::bind(&addr).serve(app.into_make_service());
    println!("Monitor-backend launched.");
    server_fut.await.unwrap();
}