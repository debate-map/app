use axum::{
	http::header::{AUTHORIZATION, CONTENT_TYPE},
	middleware,
	response::Html,
	routing::get,
	Router,
};
use rust_shared::anyhow::Error;
use rust_shared::hyper::{Method, Request};
use rust_shared::{
	anyhow::{bail, ensure},
	axum::{
		self,
		extract::{ConnectInfo, Extension},
		middleware::Next,
		response::{self, IntoResponse, Response},
	},
	http_body_util::Full,
	tokio::net::TcpListener,
	tower_http::{self, cors::AllowOrigin, trace::TraceLayer},
	utils::general::k8s_env,
};
use rust_shared::{serde_json::json, tokio};
use tower_http::cors::CorsLayer;

use std::{net::SocketAddr, process::Command};
use tracing::{error, info};
use tracing_subscriber::{self, Layer};

use crate::{
	db::general::{backups::try_get_db_dump, sign_in, sign_in_::jwt_utils::resolve_jwt_to_user_info},
	globals::{set_up_globals, GLOBAL},
	gql::{self, get_gql_data_from_http_request},
	links::{
		monitor_backend_link::{http_response_of_bad_gateway_for_non_pod_caller, is_addr_from_pod, monitor_backend_link_handle_ws_upgrade},
		pgclient,
	},
	store::storage::{AppState, AppStateArc},
	utils::{axum_logging_layer::print_request_response, db::accessors::AccessorContext, general::data_anchor::DataAnchorFor1},
};

pub fn in_debugger() -> bool {
	std::env::var("DEBUGGER").unwrap_or_default() == "LLDB"
}

pub fn route_path(path: &str) -> String {
	let running_outside_of_k8s = in_debugger();
	let prefix = if running_outside_of_k8s { "/app-server" } else { "" };
	assert!(path.starts_with("/"));
	format!("{}{}", prefix, path)
}

pub fn get_cors_layer() -> CorsLayer {
	// ref: https://docs.rs/tower-http/latest/tower_http/cors/index.html
	CorsLayer::new()
		//.allow_origin(any())
		.allow_origin(AllowOrigin::predicate(|_, _| true)) // must use true (ie. have response's "allowed-origin" always equal the request origin) instead of "*", since we have credential-inclusion enabled
		//.allow_methods(any()),
		//.allow_methods(vec![Method::GET, Method::POST])
		.allow_methods(vec![Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::HEAD, Method::OPTIONS, Method::CONNECT, Method::PATCH, Method::TRACE])
		//.allow_headers(vec!["*", "Authorization", HeaderName::any(), FORWARDED, "X-Forwarded-For", "X-Forwarded-Host", "X-Forwarded-Proto", "X-Requested-With"])
		.allow_headers(vec![
			CONTENT_TYPE,  // needed, because the POST requests include a content-type header (which is not on the approved-by-default list)
			AUTHORIZATION, // needed for attaching of auth-data
		])
		.allow_credentials(true)
}

pub async fn start_router(app_state: AppStateArc) {
	let app = Router::new()
		.route(
			&route_path("/"),
			get(|| async {
				Html(
					r#"
                <p>This is the URL for the app-server, which is not meant to be opened directly by your browser.</p>
                <p>Navigate to <a href="https://debatemap.app">debatemap.app</a> instead. (or localhost:5100/localhost:5101, if running Debate Map locally)</p>
            "#,
				)
			}),
		)
		.route(
			&route_path("/basic-info"),
			get(|ConnectInfo(addr): ConnectInfo<SocketAddr>| async move {
				if !is_addr_from_pod(&addr) {
					return http_response_of_bad_gateway_for_non_pod_caller("/monitor-backend-link", &addr);
				}

				let memUsed = GLOBAL.get();
				println!("Memory used: {memUsed} bytes");
				let res_json = json!({
					"memUsed": memUsed,
				});
				//axum::response::Json(res_json)
				//Full::from(res_json)
				Response::builder().body(res_json.to_string()).unwrap().into_response()
			}),
		)
		.route(&route_path("/monitor-backend-link"), get(monitor_backend_link_handle_ws_upgrade));

	//let (client, connection) = pgclient::create_client(false).await;
	let app = gql::extend_router(app, app_state.clone()).await;

	// add sign-in routes
	let app = sign_in::extend_router(app).await;

	// cors layer apparently must be added after the stuff it needs to apply to
	let app = app
		.layer(Extension(app_state.clone()))
		//.with_state(app_state.clone()) // for new version of axum apparently
		.layer(Extension(middleware::from_fn::<_, Response<axum::body::Body>>(print_request_response)))
		.layer(get_cors_layer())
		.layer(TraceLayer::new_for_http());

	let addr = SocketAddr::from(([0, 0, 0, 0], 5110)); // ip of 0.0.0.0 means it can receive connections from outside this pod (eg. other pods, the load-balancer)
	let listener = TcpListener::bind(&addr).await.unwrap();
	let server_fut = axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>());
	info!("App-server launched on {}. @env:{:?} @logical_cpus:{} @physical_cpus:{}", addr, k8s_env(), num_cpus::get(), num_cpus::get_physical());
	server_fut.await.unwrap();
}
