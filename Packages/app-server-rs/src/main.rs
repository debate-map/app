#![feature(backtrace)]
#![feature(fn_traits)]
#![feature(iterator_try_collect)]
#![feature(try_trait_v2)]
#![feature(try_trait_v2_residual)]
#![feature(duration_checked_float)]
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
    routing::{get},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE}
    }, middleware,
};
use tower_http::cors::{CorsLayer, Origin};
use std::{
    net::{SocketAddr}, panic, backtrace::Backtrace,
};

use crate::{store::{live_queries::{LQStorage}, storage::{AppStateWrapper, AppState}}, utils::{axum_logging_layer::print_request_response, general::errors::simplify_stack_trace_str}};

// for testing cargo-check times
// (in powershell, first run `$env:RUSTC_BOOTSTRAP="1"; $env:FOR_RUST_ANALYZER="1"; $env:STRIP_ASYNC_GRAPHQL="1";`, then run `cargo check` for future calls in that terminal)
pub fn test1() {
    println!("123");
}

mod gql;
mod proxy_to_asjs;
mod pgclient;
mod db {
    pub mod _general;
    pub mod general {
        pub mod subtree;
        pub mod subtree_accessors;
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
mod store {
    pub mod storage;
    pub mod live_queries;
    pub mod live_queries_ {
        pub mod lq_batch;
        pub mod lq_group;
        pub mod lq_instance;
        pub mod lq_param;
    }
}
mod utils {
    pub mod axum_logging_layer;
    pub mod db {
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
        pub mod sql_param;
    }
    pub mod general {
        pub mod errors;
        pub mod extensions;
        pub mod general;
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

#[tokio::main]
async fn main() {
    //panic::always_abort();
    panic::set_hook(Box::new(|info| {
        //let stacktrace = Backtrace::capture();
        let stacktrace = Backtrace::force_capture();
        let stacktrace_str_simplified = simplify_stack_trace_str(stacktrace.to_string());
        println!("Got panic. @info:{}\n@stackTrace:\n==========\n{}", info, stacktrace_str_simplified);
        std::process::abort();
    }));

    let app_state = AppStateWrapper::new(AppState {});
    //let storage = Storage::<'static>::default();
    let lq_storage = LQStorage::new_in_wrapper();

    let app = Router::new()
        .route("/", get(|| async { Html(r#"
            <p>This is the URL for the app-server, which is not meant to be opened directly by your browser.</p>
            <p>Navigate to <a href="https://debatemap.app">debatemap.app</a> instead. (or localhost:5100/localhost:5101, if running Debate Map locally)</p>
        "#) }));

    //let (client, connection) = pgclient::create_client(false).await;
    let pool = pgclient::create_db_pool();
    let app = gql::extend_router(app, pool, lq_storage.clone()).await;

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
                    println!("PGClient loop ended for some reason; restarting shortly. Result:{:?}", result);
                },
                Err(err) => {
                    println!("PGClient loop had error; restarting shortly. @error:{:?}", err);
                    errors_hit += 1;
                }
            };
            tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
        }
    });

    let addr = SocketAddr::from(([0, 0, 0, 0], 5110)); // ip of 0.0.0.0 means it can receive connections from outside this pod (eg. other pods, the load-balancer)
    let server_fut = axum::Server::bind(&addr).serve(app.into_make_service());
    println!("App-server-rs launched.");
    server_fut.await.unwrap();
}