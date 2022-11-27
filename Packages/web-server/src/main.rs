#![feature(backtrace)]
#![feature(fn_traits)]
#![feature(iterator_try_collect)]
#![feature(try_trait_v2)]
#![feature(try_trait_v2_residual)]
#![feature(duration_checked_float)]
#![feature(let_chains)]
//#![feature(unsized_locals)]
//#![feature(unsized_fn_params)]
#![feature(box_patterns)]

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

use rust_shared::{futures, axum::{self, response::{IntoResponse, Response}, body::{Empty, self, Full, Body, boxed}, extract::Path, http::{header, HeaderValue, StatusCode}}, tower::{self, ServiceBuilder, ServiceExt}, tower_http::{self, services::ServeDir}, tokio::fs};
use axum::{
    response::{Html},
    routing::{get},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE}
    }, middleware,
};
use rust_shared::{serde_json::json, tokio};
use tower_http::cors::{CorsLayer, Origin};
use tower_http::trace::TraceLayer;
use tracing::Level;
use tracing_subscriber::{prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt, filter, Layer};
use std::{
    net::{SocketAddr}, panic, backtrace::Backtrace, path::PathBuf, env,
};
use std::alloc::System;
//use include_dir::{include_dir, Dir};

static STATIC_DIR_PATH: &'static str  = "../client/Dist";

fn set_up_globals() /*-> (ABSender<LogEntry>, ABReceiver<LogEntry>)*/ {
    // set up logging
    let printing_layer_func = filter::filter_fn(move |metadata| {
        let levels_to_exclude = &[Level::TRACE, Level::DEBUG];
        !levels_to_exclude.contains(metadata.level())
    });
    let printing_layer = tracing_subscriber::fmt::layer().with_filter(printing_layer_func);
    tracing_subscriber::registry().with(printing_layer).init();
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    set_up_globals();
    println!("Setup of globals completed."); // have one regular print-line, in case logger has issues

    let app = Router::new()
        .fallback(get(|req| async move {
            match ServeDir::new(&STATIC_DIR_PATH).oneshot(req).await {
                Ok(res) => {
                    let status = res.status();
                    match status {
                        StatusCode::NOT_FOUND => {
                            let index_path = PathBuf::from(&STATIC_DIR_PATH).join("index.html");
                            let index_content = match fs::read_to_string(index_path).await {
                                Ok(index_content) => index_content,
                                Err(_) => {
                                    return Response::builder()
                                        .status(StatusCode::NOT_FOUND)
                                        .body(boxed(Body::from("Index file not found.")))
                                        .unwrap()
                                }
                            };

                            Response::builder()
                                .status(StatusCode::OK)
                                .body(boxed(Body::from(index_content)))
                                .unwrap()
                        },
                        _ => res.map(boxed),
                    }
                },
                Err(err) => Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(boxed(Body::from(format!("Error: {err}")))).unwrap()
            }
        }))
        .layer(ServiceBuilder::new().layer(TraceLayer::new_for_http()));    

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 5100));

    log::info!("Listening on http://{}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}