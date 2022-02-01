#![feature(backtrace)]
//#![feature(unsized_locals)]
//#![feature(unsized_fn_params)]
#![feature(destructuring_assignment)]

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

use crate::{store::storage::{StorageWrapper, AppState, LQStorage, DropLQWatcherMsg}, proxy_to_asjs::proxy_to_asjs_handler, utils::axum_logging_layer::print_request_response};

mod gql;
mod proxy_to_asjs;
mod pgclient;
mod db {
    pub mod _general;
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
}
mod utils {
    pub mod async_graphql_axum_custom;
    pub mod axum_logging_layer;
    pub mod filter;
    pub mod general;
    pub mod gql_general_extension;
    pub mod gql_result_stream;
    pub mod postgres_parsing;
    pub mod type_aliases;
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
        println!("Got panic. @info:{}\n@stackTrace:{}", info, stacktrace);
        std::process::abort();
    }));

    let user_set = std::sync::Mutex::new(HashSet::new());
    let (tx, _rx) = broadcast::channel(100);

    let app_state = Arc::new(AppState { user_set, tx });
    //let storage = Storage::<'static>::default();
    let (lq_storage, receiver_for_lq_watcher_drops) = LQStorage::new();
    let storage_wrapper = StorageWrapper::new(Mutex::new(lq_storage));

    // start this listener for drop requests
    let storage_wrapper_clone = storage_wrapper.clone();
    tokio::spawn(async move {
        loop {
            let drop_msg = receiver_for_lq_watcher_drops.recv_async().await.unwrap();
            match drop_msg {
                DropLQWatcherMsg::Drop_ByCollectionAndFilterAndStreamID(table_name, filter, stream_id) => {
                    let mut storage = storage_wrapper_clone.lock().await;
                    storage.drop_lq_watcher(table_name, &filter, stream_id);
                },
            };
        }
    });

    let app = Router::new()
        .route("/", get(|| async { Html(r#"
            <p>This is the URL for the app-server, which is not meant to be opened directly by your browser.</p>
            <p>Navigate to <a href="https://debatemap.app">debatemap.app</a> instead. (or localhost:3005/localhost:3055, if running Debate Map locally)</p>
        "#) }));

    let (client, connection) = pgclient::create_client(false).await;
    let app = gql::extend_router(app, client, storage_wrapper.clone());
    //let app = gql_post::extend_router(app, client);
    // the connection object performs the actual communication with the database, so spawn it off to run on its own
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        } else {
            println!("Postgres connection formed, for fulfilling subscriptions.")
        }
    });

    let app = app
        .layer(AddExtensionLayer::new(app_state))
        .layer(AddExtensionLayer::new(middleware::from_fn(print_request_response)))
        .layer(get_cors_layer());

    let _handler = tokio::spawn(async move {
        let mut errors_hit = 0;
        while errors_hit < 1000 {
            let (mut client2, mut connection2) = pgclient::create_client(true).await;
            let result = pgclient::start_streaming_changes(client2, connection2, storage_wrapper.clone()).await;
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

    let addr = SocketAddr::from(([0, 0, 0, 0], 3105)); // ip of 0.0.0.0 means it can receive connections from outside this pod (eg. other pods, the load-balancer)
    let server_fut = axum::Server::bind(&addr).serve(app.into_make_service());
    println!("App-server-rs launched.");
    server_fut.await.unwrap();
}