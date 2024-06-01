use deadpool_postgres::{Manager, ManagerConfig, Pool, PoolConfig, RecyclingMethod, Runtime};
use rust_shared::bytes::Bytes;
use rust_shared::futures::{future, ready, Sink, StreamExt};
use rust_shared::tokio::join;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{
	tokio_postgres,
	tokio_postgres::{tls::NoTlsStream, Client, Connection, NoTls, SimpleQueryMessage, SimpleQueryRow, Socket},
};
use std::{
	env,
	task::Poll,
	time::{SystemTime, UNIX_EPOCH},
};
use tracing::info;

pub fn get_tokio_postgres_config() -> tokio_postgres::Config {
	// get connection info from env-vars
	let ev = |name| env::var(name).unwrap();
	info!("Postgres connection-info: postgres://{}:<redacted>@{}:{}/debate-map", ev("DB_USER"), ev("DB_ADDR"), ev("DB_PORT"));

	let mut cfg = tokio_postgres::Config::new();
	cfg.user(&ev("DB_USER"));
	cfg.password(ev("DB_PASSWORD"));
	cfg.host(&ev("DB_ADDR"));
	cfg.port(ev("DB_PORT").parse::<u16>().unwrap());
	cfg.dbname("debate-map");
	cfg
}

/// Only use this if you need the for_replication option. (everything else should use clients taken from the shared pool)
pub async fn create_client_advanced(for_replication: bool) -> (Client, Connection<Socket, NoTlsStream>) {
	let mut pg_cfg = get_tokio_postgres_config();
	if for_replication {
		//db_config += " replication=database";
		//cfg.options(options);
		pg_cfg.replication_mode(tokio_postgres::config::ReplicationMode::Logical);
	}

	// connect to the database
	let (client, connection) = pg_cfg.connect(NoTls).await.unwrap();
	(client, connection)
}

pub fn create_db_pool() -> Pool {
	let pg_cfg = get_tokio_postgres_config();
	let mgr_cfg = ManagerConfig { recycling_method: RecyclingMethod::Fast };
	let mgr = Manager::from_config(pg_cfg, NoTls, mgr_cfg);
	//let pool_size = 1;
	let pool_size = 30;
	let pool = Pool::builder(mgr).max_size(pool_size).runtime(Runtime::Tokio1).build().unwrap();
	pool
}
