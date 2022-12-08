#![feature(iterator_try_collect)]
#![feature(try_trait_v2)]
#![feature(try_trait_v2_residual)]
#![feature(duration_checked_float)]
#![feature(let_chains)]
//#![feature(unsized_locals)]
//#![feature(unsized_fn_params)]
//#![feature(integer_atomics, const_fn_trait_bound)] // needed for mem_alloc.rs
//#![feature(box_patterns)]
//#![feature(fn_traits)]

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

use rust_shared::{futures, axum, tower, tower_http};
use axum::{
    response::{Html},
    routing::{get},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE}
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

use crate::{store::{live_queries::{LQStorage}, storage::{AppStateWrapper, AppState}}, utils::{axum_logging_layer::print_request_response, general::errors::simplify_stack_trace_str}, links::{monitor_backend_link::{monitor_backend_link_handle_ws_upgrade}, pgclient}, db::general::sign_in};

// for testing cargo-check times
// (in powershell, first run `$env:RUSTC_BOOTSTRAP="1"; $env:FOR_RUST_ANALYZER="1"; $env:STRIP_ASYNC_GRAPHQL="1";`, then run `cargo check` for future calls in that terminal)
pub fn test1() {
    println!("123");
}

mod gql;
mod links {
    pub mod monitor_backend_link;
    pub mod pgclient;
    pub mod proxy_to_asjs;
}
mod store {
    pub mod storage;
    pub mod live_queries;
    pub mod live_queries_ {
        pub mod lq_batch;
        pub mod lq_batch_ {
            pub mod sql_generator;
        }
        pub mod lq_group;
        pub mod lq_instance;
        pub mod lq_param;
    }
}
mod utils {
    pub mod axum_logging_layer;
    pub mod db {
        pub mod accessors;
        pub mod agql_ext {
            pub mod gql_general_extension;
            pub mod gql_result_stream;
        }
        pub mod filter;
        pub mod sql_fragment;
        pub mod handlers;
        pub mod pg_stream_parsing;
        pub mod pg_row_to_json;
        pub mod queries;
        pub mod sql_ident;
        pub mod sql_param;
        pub mod transactions;
    }
    pub mod general {
        pub mod data_anchor;
        pub mod errors;
        pub mod extensions;
        pub mod general;
        pub mod logging;
        pub mod mem_alloc;
    }
    pub mod http;
    pub mod mtx {
        pub mod mtx;
    }
    pub mod type_aliases;
    pub mod quick_tests {
        pub mod quick1;
    }
}
mod db {
    pub mod commands {
        pub mod _command;
        // temp-removed
        //pub mod add_node_revision;
        pub mod clone_subtree;
        pub mod refresh_lq_data;
        //pub mod transfer_nodes;
        pub mod add_term;
    }
    pub mod _general;
    pub mod general {
        pub mod search;
        pub mod sign_in;
        pub mod subtree_old;
        pub mod subtree_collector_old;
        pub mod subtree;
        pub mod subtree_collector;
    }
    pub mod users;
    pub mod user_hiddens;
    pub mod global_data;
    pub mod maps;
    pub mod terms;
    pub mod access_policies;
    pub mod medias;
    pub mod command_runs;
    pub mod feedback_proposals;
    pub mod feedback_user_infos;
    pub mod map_node_edits;
    pub mod node_child_links;
    pub mod node_phrasings;
    pub mod node_ratings;
    pub mod node_revisions;
    pub mod node_tags;
    pub mod nodes;
    pub mod shares;
}

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
        .allow_headers(vec![CONTENT_TYPE]) // needed, because the POST requests include a content-type header (which is not on the approved-by-default list)
        .allow_credentials(true)
}

fn set_up_globals() /*-> (ABSender<LogEntry>, ABReceiver<LogEntry>)*/ {
    //panic::always_abort();
    panic::set_hook(Box::new(|info| {
        //let stacktrace = Backtrace::capture();
        let stacktrace = Backtrace::force_capture();
        let stacktrace_str_simplified = simplify_stack_trace_str(stacktrace.to_string());

        // if panic occurs, first do a simple logging with println!, in case the panic occurred within the logging-system
        println!("Got panic. @info:{} [see next log-message for stack-trace]", info);

        error!("Got panic. @info:{}\n@stackTrace:\n==========\n{}", info, stacktrace_str_simplified);
        std::process::abort();
    }));

    dotenv().ok(); // load the environment variables from the ".env" file

    /*let (mut s1, r1): (ABSender<LogEntry>, ABReceiver<LogEntry>) = async_broadcast::broadcast(10000);
    s1.set_overflow(true);
    set_up_logging(s1.clone());
    (s1, r1)*/
    set_up_logging();
}

//#[tokio::main(flavor = "multi_thread", worker_threads = 7)]
#[tokio::main]
async fn main() {
    //let (log_entry_sender, log_entry_receiver) = set_up_globals();
    set_up_globals();
    println!("Setup of globals completed."); // have one regular print-line, in case logger has issues

    GLOBAL.reset();
    info!("memory used: {} bytes", GLOBAL.get());

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
    info!("App-server-rs launched. @logical_cpus:{} @physical_cpus:{}", num_cpus::get(), num_cpus::get_physical());
    server_fut.await.unwrap();
}