// sync among all rust crates
#![warn(clippy::all, clippy::pedantic, clippy::cargo)]
#![allow(
    unused_imports, // makes refactoring a pain (eg. you comment out a line to test something, and now must scroll-to-top and comment lots of stuff) [more importantly, conflicts with wrap_slow_macros! atm; need to resolve that]
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

use rust_shared::async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use rust_shared::utils::general::k8s_env;
use rust_shared::{futures, axum, tower, tower_http, tokio};
use axum::{
    response::{Html, self, IntoResponse},
    routing::{get, any_service, post, get_service},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE}
    },
    headers::HeaderName, middleware, body::{BoxBody, boxed},
};
use rust_shared::hyper::{server::conn::AddrStream, service::{make_service_fn, service_fn}, Request, Body, Response, StatusCode, header::{FORWARDED, self}, Uri};
use links::app_server_rs_types::LogEntry;
use tower::ServiceExt;
use tower_http::{cors::{CorsLayer, Origin, AnyOr}, services::ServeFile};
use tracing::{error, info, Level, Metadata};
use tracing_subscriber::{Layer, filter, prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt};
use utils::{type_aliases::{FSender, FReceiver}};
use std::{
    collections::HashSet,
    net::{SocketAddr, IpAddr},
    sync::{Arc}, panic, backtrace::Backtrace, convert::Infallible, str::FromStr, time::Duration,
};
use rust_shared::tokio::{sync::{broadcast, Mutex}, runtime::Runtime};
use flume::{Sender, Receiver, unbounded};
use tower_http::{services::ServeDir};

use crate::{store::storage::{AppState, AppStateWrapper}, links::app_server_rs_link::connect_to_app_server_rs, utils::type_aliases::{ABReceiver, ABSender}};

mod gql_;
mod gql {
    pub mod _general;
}
//mod proxy_to_asjs;
mod pgclient;
mod links {
    pub mod app_server_rs_types;
    pub mod app_server_rs_link;
}
mod utils {
    pub mod general;
    pub mod type_aliases;
}
mod store {
    pub mod storage;
}
mod testing {
    pub mod general;
}
/*mod connections {
    pub mod from_app_server_rs;
}*/
mod migrations {
    pub mod v2;
}

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

#[derive(Clone, Debug)]
pub enum GeneralMessage {
    LogEntryAdded(LogEntry),
    MigrateLogMessageAdded(String),
    TestingLogMessageAdded(String),
}

// for some very-strange reason, using the tokio::broadcast::[Sender/Receiver] to transmit LogEntry's (from app_server_rs_link.rs to _general.rs) silently fails
// it fails for async-flume as well, but switching to sync-flume fixes it -- so we need this second-version of GeneralMessage that uses flume (maybe switch to flume completely later, eg. making a broadcast-like wrapper)
// I suspect the issue has something to do with the "silent dropping of futures" that I had to work-around in handlers.rs...
// ...but wasn't able to discover the "difference" between MigrateLogMessageAdded and LogEntryAdded pathway that would explain it (and thus suggest a proper solution)
/*#[derive(Clone, Debug)]
pub enum GeneralMessage_Flume {
    LogEntryAdded(LogEntry),
}*/

fn set_up_globals() {
    panic::set_hook(Box::new(|info| {
        let stacktrace = Backtrace::force_capture();
        error!("Got panic. @info:{}\n@stackTrace:{}", info, stacktrace);
        std::process::abort();
    }));

    //tracing_subscriber::fmt::init(); // install global collector configured based on RUST_LOG env var
    let printing_layer = tracing_subscriber::fmt::layer().with_filter(filter::filter_fn(move |metadata| {
        //should_event_be_kept(metadata, &[Level::TRACE, Level::DEBUG])
        should_event_be_kept(metadata, &[Level::TRACE])
        //should_event_be_kept(metadata, &[])
    }));
    tracing_subscriber::registry().with(printing_layer).init();
}
pub fn should_event_be_kept(metadata: &Metadata, levels_to_exclude: &[Level]) -> bool {
    if !metadata.target().starts_with("monitor_backend") { return false; }
    if levels_to_exclude.contains(metadata.level()) { return false; }
    true
}

#[tokio::main]
async fn main() {
    set_up_globals();
    println!("Setup of globals completed."); // have one regular print-line, in case logger has issues
    
    let app_state = AppStateWrapper::new(AppState::default());

    let app = Router::new()
        /*.route("/", get(|| async { Html(r#"
            <p>This is the URL for the monitor-backend.</p>
            <p>Navigate to <a href="https://debatemap.app">debatemap.app</a> instead. (or localhost:5100/localhost:5101, if running Debate Map locally)</p>
        "#) }))*/
        //.route("/send-mtx-results", post(send_mtx_results))
        .fallback(get(handler));

    //let (msg_sender_test, msg_receiver_test): (Sender<GeneralMessage_Flume>, Receiver<GeneralMessage_Flume>) = flume::unbounded();
    //let (msg_sender, msg_receiver): (broadcast::Sender<GeneralMessage>, broadcast::Receiver<GeneralMessage>) = broadcast::channel(10000);
    //let (msg_sender, msg_receiver): (ABSender<GeneralMessage>, ABReceiver<GeneralMessage>) = postage::broadcast::channel(10000);
    let (mut msg_sender, msg_receiver): (ABSender<GeneralMessage>, ABReceiver<GeneralMessage>) = async_broadcast::broadcast(10000);
    msg_sender.set_overflow(true);
    //tokio::spawn(connect_to_app_server_rs(msg_sender_test.clone()));
    tokio::spawn(connect_to_app_server_rs(app_state.clone(), msg_sender.clone()));

    let app = gql_::extend_router(app, msg_sender, msg_receiver, /*msg_sender_test, msg_receiver_test,*/ app_state.clone()).await;

    // cors layer apparently must be added after the stuff it needs to apply to
    let app = app
        .layer(AddExtensionLayer::new(app_state))
        .layer(get_cors_layer());

    let addr = SocketAddr::from(([0, 0, 0, 0], 5130)); // ip of 0.0.0.0 means it can receive connections from outside this pod (eg. other pods, the load-balancer)
    //let server_fut = axum::Server::bind(&addr).serve(app.into_make_service());
    //let server_fut = axum::Server::bind(&addr).serve(app.into_make_service_with_connect_info());
    let server_fut = axum::Server::bind(&addr).serve(app.into_make_service_with_connect_info::<SocketAddr, _>());
    info!("Monitor-backend launched. @env:{:?}", k8s_env());
    server_fut.await.unwrap();
}

async fn handler(uri: Uri) -> Result<Response<BoxBody>, (StatusCode, String)> {
    // see here for meaning of the parts: https://docs.rs/hyper/latest/hyper/struct.Uri.html
    /*let axum::http::uri::Parts { scheme, authority, path_and_query, .. } = uri.clone().into_parts();
    let path = path_and_query.clone().map_or("".to_owned(), |a| a.path().to_string());
    let query = path_and_query.map_or("".to_owned(), |a| a.query().unwrap_or("").to_owned());*/
    //println!("BaseURI:{}", uri);
    let (scheme, authority, path, _query) = {
        let temp = uri.clone().into_parts();
        (
            "https", //temp.scheme.map_or("".to_owned(), |a| a.to_string()),
            "debatemap.app", //temp.authority.map_or("".to_owned(), |a| a.to_string()),
            temp.path_and_query.clone().map_or("".to_owned(), |a| a.path().to_string()),
            temp.path_and_query.map_or("".to_owned(), |a| a.query().unwrap_or("").to_owned()),
        )
    };
    
    // try resolving path from "/Dist" folder
    if let Ok(uri_variant) = Uri::from_str(&format!("{scheme}://{authority}/Dist/{path}")) {
        let res = get_static_file(uri_variant.clone()).await?;
        if res.status() != StatusCode::NOT_FOUND { return Ok(res); }
    }

    // try resolving path from "/Resources" folder
    if let Ok(uri_variant) = Uri::from_str(&format!("{scheme}://{authority}/Resources/{path}")) {
        let res = get_static_file(uri_variant.clone()).await?;
        if res.status() != StatusCode::NOT_FOUND { return Ok(res); }
    }

    // if all else fails, just resolve to "/Dist/index.html"
    //println!("Test:{}", format!("{scheme}://{authority}/Dist/index.html"));
    if let Ok(uri_variant) = Uri::from_str(&format!("{scheme}://{authority}/Dist/index.html")) {
        let res = get_static_file(uri_variant.clone()).await?;
        //println!("Response for index.html: {:?}", res);
        if res.status() != StatusCode::NOT_FOUND { return Ok(res); }
    }

    return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Something went wrong; failed to resolve URI to a resource.")));
}

async fn get_static_file(uri: Uri) -> Result<Response<BoxBody>, (StatusCode, String)> {
    let req = Request::builder().uri(uri).body(Body::empty()).unwrap();
    let root_resolve_folder = "../monitor-client";

    // `ServeDir` implements `tower::Service` so we can call it with `tower::ServiceExt::oneshot`
    match ServeDir::new(root_resolve_folder).oneshot(req).await {
        Ok(res) => Ok(res.map(boxed)),
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Something went wrong: {}", err),
        )),
    }
}