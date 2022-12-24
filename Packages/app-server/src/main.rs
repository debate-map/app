#![feature(let_chains)]
//#![feature(unsized_locals)]
//#![feature(unsized_fn_params)]
//#![feature(integer_atomics, const_fn_trait_bound)] // needed for mem_alloc.rs
//#![feature(box_patterns)]
//#![feature(fn_traits)]
// needed atm for GQLError (see TODO.rs)
#![feature(auto_traits)]
#![feature(negative_impls)]

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

use rust_shared::{futures, axum, tower, tower_http, utils::{general::k8s_env, errors_::backtrace_simplifier::simplify_backtrace_str}};
use axum::{
    response::{Html},
    routing::{get},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE, AUTHORIZATION}
    }, middleware,
};
use flume::Receiver;
use rust_shared::{serde_json::json, tokio};
use tower_http::cors::{CorsLayer, Origin};
use utils::{general::{mem_alloc::Trallocator, logging::{set_up_logging, LogEntry}}, type_aliases::{ABSender, ABReceiver}};
use std::{
    net::{SocketAddr}, panic, backtrace::Backtrace,
};
use std::alloc::System;
use tracing::{info, error, metadata::LevelFilter};
use tracing_subscriber::{self, prelude::__tracing_subscriber_SubscriberExt, Layer, util::SubscriberInitExt, filter};
use dotenv::dotenv;

use crate::{store::{live_queries::{LQStorage}, storage::{AppStateWrapper, AppState}}, utils::{axum_logging_layer::print_request_response}, links::{monitor_backend_link::{monitor_backend_link_handle_ws_upgrade}, pgclient}, db::general::sign_in};

// folders (we only use "folder_x/mod.rs" files one-layer deep; keeps the mod-tree structure out of main.rs, while avoiding tons of mod.rs files littering the codebase)
mod db;
mod links;
mod store;
mod utils;
// files
mod gql;

#[global_allocator]
static GLOBAL: Trallocator<System> = Trallocator::new(System);

pub fn get_cors_layer() -> CorsLayer {
    // ref: https://docs.rs/tower-http/latest/tower_http/cors/index.html
    CorsLayer::new()
        //.allow_origin(any())
        .allow_origin(Origin::predicate(|_, _| { true })) // must use true (ie. have response's "allowed-origin" always equal the request origin) instead of "*", since we have credential-inclusion enabled
        //.allow_methods(any()),
        //.allow_methods(vec![Method::GET, Method::POST])
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
        //.allow_headers(vec!["*", "Authorization", HeaderName::any(), FORWARDED, "X-Forwarded-For", "X-Forwarded-Host", "X-Forwarded-Proto", "X-Requested-With"])
        .allow_headers(vec![
            CONTENT_TYPE, // needed, because the POST requests include a content-type header (which is not on the approved-by-default list)
            AUTHORIZATION, // needed for attaching of auth-data
        ])
        .allow_credentials(true)
}

fn set_up_globals() /*-> (ABSender<LogEntry>, ABReceiver<LogEntry>)*/ {
    //panic::always_abort();
    panic::set_hook(Box::new(|info| {
        //let stacktrace = Backtrace::capture();
        let stacktrace = Backtrace::force_capture();
        let stacktrace_str_simplified = simplify_backtrace_str(stacktrace.to_string());

        // if panic occurs, first do a simple logging with println!, in case the panic occurred within the logging-system
        println!("Got panic. @info:{} [see next log-message for stack-trace]", info);

        error!("Got panic. @info:{}\n@stackTrace:\n==========\n{}", info, stacktrace_str_simplified);
        std::process::abort();
    }));

    dotenv().ok(); // load the environment variables from the ".env" file

    set_up_logging();
}

//#[tokio::main(flavor = "multi_thread", worker_threads = 7)]
#[tokio::main]
async fn main() {
    set_up_globals();
    println!("Setup of globals completed."); // have one regular print-line, in case logger has issues

    GLOBAL.reset();
    info!("Memory used: {} bytes", GLOBAL.get());

    let app_state = AppState::new_in_wrapper();
    //let storage = Storage::<'static>::default();
    let lq_storage = LQStorage::new_in_wrapper();

    let app = Router::new()
        .route("/", get(|| async {
            Html(r#"
                <p>This is the URL for the app-server, which is not meant to be opened directly by your browser.</p>
                <p>Navigate to <a href="https://debatemap.app">debatemap.app</a> instead. (or localhost:5100/localhost:5101, if running Debate Map locally)</p>
            "#)
        }))
        .route("/basic-info", get(|| async {
            let memUsed = GLOBAL.get();
            println!("memory used: {memUsed} bytes");
            axum::response::Json(json!({
                "memUsed": memUsed,
            }))
        }))
        .route("/monitor-backend-link", get(monitor_backend_link_handle_ws_upgrade));

    //let (client, connection) = pgclient::create_client(false).await;
    let pool = pgclient::create_db_pool();
    let app = gql::extend_router(app, pool, app_state.clone(), lq_storage.clone()).await;

    // add sign-in routes
    let app = sign_in::extend_router(app, app_state.clone()).await;

    // cors layer apparently must be added after the stuff it needs to apply to
    let app = app
        .layer(AddExtensionLayer::new(app_state))
        .layer(AddExtensionLayer::new(middleware::from_fn(print_request_response)))
        .layer(get_cors_layer());

    let _handler = tokio::spawn(async move {
        let mut errors_hit = 0;
        while errors_hit < 1000 {
            let (client_replication, connection_replication) = pgclient::create_client(true).await;
            let result = pgclient::start_streaming_changes(client_replication, connection_replication, lq_storage.clone()).await;
            match result {
                Ok(result) => {
                    //println!("PGClient loop ended for some reason. Result:{:?}", result);
                    error!("PGClient loop ended for some reason; restarting shortly. Result:{:?}", result);
                },
                Err(err) => {
                    error!("PGClient loop had error; restarting shortly. @error:{:?}", err);
                    errors_hit += 1;
                }
            };
            tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
        }
    });

    let addr = SocketAddr::from(([0, 0, 0, 0], 5110)); // ip of 0.0.0.0 means it can receive connections from outside this pod (eg. other pods, the load-balancer)
    //let server_fut = axum::Server::bind(&addr).serve(app.into_make_service());
    let server_fut = axum::Server::bind(&addr).serve(app.into_make_service_with_connect_info::<SocketAddr, _>());
    info!("App-server launched. @env:{:?} @logical_cpus:{} @physical_cpus:{}", k8s_env(), num_cpus::get(), num_cpus::get_physical());
    server_fut.await.unwrap();
}