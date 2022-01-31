#![feature(backtrace)]
//#![feature(unsized_locals)]
//#![feature(unsized_fn_params)]
#![feature(destructuring_assignment)]

use axum::{
    response::{Html},
    routing::{get},
    AddExtensionLayer, Router, http::{
        Method,
        header::{CONTENT_TYPE}
    },
};
use tower_http::cors::{CorsLayer, Origin};
use std::{
    collections::HashSet,
    net::SocketAddr,
    sync::{Arc}, panic, backtrace::Backtrace,
};
use tokio::{sync::{broadcast, Mutex}, runtime::Runtime};

use crate::store::storage::{StorageWrapper, AppState, LQStorage, DropLQWatcherMsg};

mod gql_ws;
mod gql_post;
mod chat;
mod pgclient;
mod db {
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
    pub mod filter;
    pub mod general;
    pub mod gql_general_extension;
    pub mod gql_result_stream;
    pub mod postgres_parsing;
    pub mod type_aliases;
}

/*#[panic_handler]
fn panic(info: &PanicInfo) {
    /*let mut host_stderr = HStderr::new();
    // logs "panicked at '$reason', src/main.rs:27:4" to the host stderr
    writeln!(host_stderr, "{}", info).ok();*/
    println!("Got panic. @info:{} @stackTrace:{:?}", info, Backtrace::capture());
}*/

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
        .route("/", get(index))
        
        //.route("/graphql", get(gql_ws::gql_websocket_handler))
        //.route("/graphql", post(gqp_post_handler))
        
        //.route("/websocket", get(chat::chat_websocket_handler))
        .layer(
            // ref: https://docs.rs/tower-http/latest/tower_http/cors/index.html
            CorsLayer::new()
                //.allow_origin(any())
                .allow_origin(Origin::predicate(|_, _| { true })) // must use true (ie. have response's "allowed-origin" always equal the request origin) instead of "*", since we have credential-inclusion enabled
                //.allow_methods(any()),
                //.allow_methods(vec![Method::GET, Method::HEAD, Method::PUT, Method::PATCH, Method::POST, Method::DELETE])
                //.allow_methods(vec![Method::GET, Method::POST])
                .allow_methods(vec![Method::GET, Method::POST])
                .allow_headers(vec![CONTENT_TYPE]) // to match with express server (probably unnecessary)
                .allow_credentials(true),
        )
        .layer(AddExtensionLayer::new(app_state));

    let addr = SocketAddr::from(([127, 0, 0, 1], 3105));

    let (client, connection) = pgclient::create_client(false).await;
    let app = gql_ws::extend_router(app, client, storage_wrapper.clone());
    // the connection object performs the actual communication with the database, so spawn it off to run on its own
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        } else {
            println!("Postgres connection formed, for fulfilling subscriptions.")
        }
    });

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

    println!("App-server-rs launched.");
    axum::Server::bind(&addr).serve(app.into_make_service()).await.unwrap();

    /*let main_server_future = axum::Server::bind(&addr).serve(app.into_make_service()).await;
    join_all(vec![handler, main_server_future]).await;*/
}

// include utf-8 HTML file at *compile* time
async fn index() -> Html<&'static str> {
    Html(std::include_str!("../chat.html"))
}