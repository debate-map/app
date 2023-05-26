use rust_shared::{axum::{self, response::{self, IntoResponse, Response}, extract::Extension, middleware::Next}, tower_http, utils::{general::k8s_env}, anyhow::{bail, ensure}};
use rust_shared::hyper::{Request, Body, Method};
use axum::{
    response::{Html},
    routing::{get},
    Router, http::{
        header::{CONTENT_TYPE, AUTHORIZATION}
    }, middleware,
};
use rust_shared::anyhow::Error;
use rust_shared::{serde_json::json, tokio};
use tower_http::cors::{CorsLayer, Origin};

use std::{
    net::{SocketAddr}, process::Command,
};
use tracing::{info, error};
use tracing_subscriber::{self, Layer};

use crate::{store::{storage::{AppState, AppStateArc}}, utils::{axum_logging_layer::print_request_response, db::accessors::AccessorContext, general::data_anchor::DataAnchorFor1}, links::{monitor_backend_link::{monitor_backend_link_handle_ws_upgrade}, pgclient}, db::general::{sign_in, sign_in_::jwt_utils::resolve_jwt_to_user_info, backups::try_get_db_dump}, globals::{set_up_globals, GLOBAL}, gql::{self, get_gql_data_from_http_request}};

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

pub async fn start_router(app_state: AppStateArc) {
    let app = Router::new()
        .route("/", get(|| async {
            Html(r#"
                <p>This is the URL for the app-server, which is not meant to be opened directly by your browser.</p>
                <p>Navigate to <a href="https://debatemap.app">debatemap.app</a> instead. (or localhost:5100/localhost:5101, if running Debate Map locally)</p>
            "#)
        }))
        .route("/basic-info", get(|| async {
            let memUsed = GLOBAL.get();
            println!("Memory used: {memUsed} bytes");
            axum::response::Json(json!({
                "memUsed": memUsed,
            }))
        }))
        .route("/monitor-backend-link", get(monitor_backend_link_handle_ws_upgrade));

    //let (client, connection) = pgclient::create_client(false).await;
    let app = gql::extend_router(app, app_state.clone()).await;

    // add sign-in routes
    let app = sign_in::extend_router(app).await;

    // cors layer apparently must be added after the stuff it needs to apply to
    let app = app
        .layer(Extension(app_state.clone()))
        //.with_state(app_state.clone()) // for new version of axum apparently
        .layer(Extension(middleware::from_fn::<_, Response<Body>>(print_request_response)))
        .layer(get_cors_layer());

    let addr = SocketAddr::from(([0, 0, 0, 0], 5110)); // ip of 0.0.0.0 means it can receive connections from outside this pod (eg. other pods, the load-balancer)
    //let server_fut = axum::Server::bind(&addr).serve(app.into_make_service());
    let server_fut = axum::Server::bind(&addr).serve(app.into_make_service_with_connect_info::<SocketAddr>());
    info!("App-server launched. @env:{:?} @logical_cpus:{} @physical_cpus:{}", k8s_env(), num_cpus::get(), num_cpus::get_physical());
    server_fut.await.unwrap();
}