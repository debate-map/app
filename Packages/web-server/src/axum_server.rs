use rust_shared::{anyhow::Error, axum::{self, body::Body, extract::Path, http::{header, HeaderValue, StatusCode}, response::{IntoResponse, Response}}, futures, tokio::{fs, net::TcpListener}, tower::{self, ServiceBuilder, ServiceExt}, tower_http::{self, services::ServeDir}, utils::{general::k8s_env, general_::extensions::ToOwnedV, net::body_to_bytes}};
use axum::{
    response::{Html},
    routing::{get},
    Router, http::{
        Method,
        header::{CONTENT_TYPE}
    }, middleware,
};
use rust_shared::{serde_json::json, tokio, http_body_util::BodyExt};
use static_web_server::Settings;
use tower_http::cors::{CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{Level, info};
use tracing_subscriber::{prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt, filter, Layer};
use std::{
    net::{SocketAddr}, panic, backtrace::Backtrace, path::PathBuf, env,
};
use std::alloc::System;

use crate::STATIC_DIR_PATH;
//use include_dir::{include_dir, Dir};

// NOTE: This file contains the old web-server, based on Axum. Atm we're using static-web-server instead of this custom server, but this is kept around in case we need to switch back to it.

pub fn main_axum() -> Result<(), Error> {
    let body = async {
        start_server_axum().await?;
        Ok(())
    };
    #[allow(clippy::expect_used, clippy::diverging_sub_expression)]
    {
        return tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("Failed building the Runtime")
            .block_on(body);
    }
}
fn set_up_globals() /*-> (ABSender<LogEntry>, ABReceiver<LogEntry>)*/ {
    // set up logging
    let printing_layer_func = filter::filter_fn(move |metadata| {
        let levels_to_exclude = &[Level::TRACE, Level::DEBUG];
        !levels_to_exclude.contains(metadata.level())
    });
    let printing_layer = tracing_subscriber::fmt::layer().with_filter(printing_layer_func);
    tracing_subscriber::registry().with(printing_layer).init();
}
async fn start_server_axum() -> Result<(), Error> {
    // we set up globals only in the axum-server branch, since static-web-server tries
    set_up_globals();
    println!("Setup of globals completed."); // have one regular print-line, in case logger has issues

    let app = Router::new()
        .fallback(get(|req| async move {
            // Note: The gzip-serving only applies for files that already have their ".gz" counterpart in the dist folder. (webpack plugin to automate this not yet set up)
            match ServeDir::new(&STATIC_DIR_PATH).precompressed_gzip().oneshot(req).await {
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
                                        .body(Body::new("Tried loading url-specified file, which wasn't found; then tried loading index.html as fallback, but it also wasn't found.".o()))
                                        .unwrap()
                                }
                            };

                            Response::builder()
                                .status(StatusCode::OK)
                                .body(Body::new(index_content))
                                .unwrap()
                        },
                        //_ => res.map(boxed),
                        _ => {
                            let (parts, body) = res.into_parts();
                            let bytes = body_to_bytes(body).await.unwrap();
                            Response::from_parts(parts, Body::from(bytes))
                        }
                    }
                },
                Err(err) => Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(Body::new(format!("Error: {err}"))).unwrap()
            }
        }))
        .layer(ServiceBuilder::new().layer(TraceLayer::new_for_http()));    

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 5100));

    info!("Web-server launched. @env:{:?} Listening on http://{}", k8s_env(), addr);

    let listener = TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}