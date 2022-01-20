use axum::{
    response::{Html, Response},
    routing::{get, any_service},
    AddExtensionLayer, Router, http::{
        Request, Method,
        header::{CONTENT_TYPE}
    }, body::Body,
};
use tower_http::cors::{CorsLayer, Origin, any};
use std::{
    collections::HashSet,
    net::SocketAddr,
    sync::{Arc, Mutex}, convert::Infallible,
};
use tokio::sync::broadcast;
mod gql_ws;
mod chat;

// Our shared state
pub struct AppState {
    pub user_set: Mutex<HashSet<String>>,
    pub tx: broadcast::Sender<String>,
}

#[tokio::main]
async fn main() {
    let user_set = Mutex::new(HashSet::new());
    let (tx, _rx) = broadcast::channel(100);

    let app_state = Arc::new(AppState { user_set, tx });

    /*let gql_websocket_handler = tower::service_fn(|request: Request<Body>| async move {
        println!("Got websocket request-type on /graphql path: {:?}", &request);
        //ws.on_upgrade(|socket| websocket(socket, state))
        Ok::<_, Infallible>(Response::new(Body::empty()))
    });
    let gql_other_handler = tower::service_fn(|request: Request<Body>| async move {
        println!("Got other request-type on /graphql path: {:?}", &request);
        Ok::<_, Infallible>(Response::new(Body::empty()))
    });*/

    let app = Router::new()
        .route("/", get(index))
        .route("/graphql", get(gql_ws::gql_websocket_handler))
        //.route("/graphql", any_service(gql_ws::gql_websocket_handler))
        //.route("/graphql", any_service(gql_other_handler).get_service(gql_websocket_handler))
        //.route("/graphql", post(gqp_post_handler))
        .route("/websocket", get(chat::chat_websocket_handler))
        //.route("/websocket", any_service(gql_other_handler).get_service(gql_websocket_handler))
        .layer(
            // see this for more details: https://docs.rs/tower-http/latest/tower_http/cors/index.html
            CorsLayer::new()
                //.allow_origin(any())
                .allow_origin(Origin::predicate(|_, _| { true })) // must use true (ie. have response's "allowed-origin" always equal the request origin) instead of "*", since we have credential-inclusion enabled
                //.allow_methods(vec![Method::GET]),
                //.allow_methods(any()),
                .allow_methods(vec![Method::GET, Method::HEAD, Method::PUT, Method::PATCH, Method::POST, Method::DELETE]) // to match with express server (probably unnecessary)
                .allow_headers(vec![CONTENT_TYPE]) // to match with express server (probably unnecessary)
                .allow_credentials(true),
        )
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