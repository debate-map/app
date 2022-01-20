use axum::{
    response::{Html},
    routing::get,
    AddExtensionLayer, Router,
};
use std::{
    collections::HashSet,
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tokio::sync::broadcast;
mod chat;

#[tokio::main]
async fn main() {
    let user_set = Mutex::new(HashSet::new());
    let (tx, _rx) = broadcast::channel(100);

    let app_state = Arc::new(chat::AppState { user_set, tx });

    let app = Router::new()
        .route("/", get(index))
        //.route("/graphql", get(gql_websocket_handler))
        //.route("/graphql", post(gqp_post_handler))
        .route("/websocket", get(chat::chat_websocket_handler))
        .layer(AddExtensionLayer::new(app_state));

    let addr = SocketAddr::from(([127, 0, 0, 1], 3105));

    println!("App-server-rs launched.");
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// Include utf-8 file at **compile** time.
async fn index() -> Html<&'static str> {
    Html(std::include_str!("../chat.html"))
}