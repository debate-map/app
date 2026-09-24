#![feature(stmt_expr_attributes)] // for the #[rustfmt::skip] block in graphlink_config.rs, same as main.rs
// Dev tool: runs graphlink's pgsync with debate-map's table_defs against a scratch database, to see the schema + policies it produces.
// Usage: DB_USER=postgres DB_PASSWORD=x DB_ADDR=127.0.0.1 DB_PORT=5499 ENVIRONMENT=dev cargo run -p app_server --example graphlink_pgsync_smoke
// (graphlink hard-codes the database name "lucid-frontier" for now, so the scratch db has to be called that)
#[path = "../src/graphlink_config.rs"]
mod graphlink_config;

use graphlink_rust::{run_pgsync, tokio, AppState};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
	tracing_subscriber::fmt().with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"))).init();
	graphlink_config::set_up_graphlink_rust(|_event| {}); // no monitor-backend here
	let app_state = AppState::new_in_arc();
	match run_pgsync(app_state).await {
		Ok(()) => println!("pgsync OK"),
		Err(err) => { println!("pgsync FAILED: {:?}", err); std::process::exit(1); },
	}
}
