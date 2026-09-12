use crate::anyhow::{anyhow, Error};
use crate::postgres_protocol::message::backend::{LogicalReplicationMessage, ReplicationMessage};
use crate::tokio::{join, select};
use crate::tokio_postgres::replication::LogicalReplicationStream;
use crate::tokio_postgres::types::PgLsn;
use crate::tokio_postgres::{tls::NoTlsStream, Client, Connection, NoTls, SimpleQueryMessage, SimpleQueryRow, Socket};
use crate::tracing::{debug, error, info, warn};
use crate::utils::general::extensions::ToOwnedV;
use crate::{axum, futures, tower, tower_http};
use crate::{
	bytes::{self, Bytes},
	indoc::formatdoc,
	itertools::Itertools,
	once_cell::sync::Lazy,
	serde_json, tokio, tokio_postgres,
};
use crate::{wal_data_tuple_to_entry_blob, AppStateArc, ColumnInfo, LDChange, LQStorageArc, OldKeys, TableInfo};
use deadpool_postgres::{Manager, ManagerConfig, Pool, PoolConfig, RecyclingMethod, Runtime};
use futures::{future, ready, Sink, StreamExt};
use std::{
	cmp::max,
	collections::HashMap,
	env,
	task::Poll,
	time::{Duration, SystemTime, UNIX_EPOCH},
};

/// Helper for easy running of simple queries, given a client.
pub async fn q(client: &Client, query: &str) -> Vec<SimpleQueryRow> {
	let msgs = client.simple_query(query).await.unwrap();
	msgs.into_iter()
		.filter_map(|msg| match msg {
			SimpleQueryMessage::Row(row) => Some(row),
			_ => None,
		})
		.collect()
}

pub fn get_tokio_postgres_config() -> tokio_postgres::Config {
	// get connection info from env-vars
	let ev = |name| env::var(name).unwrap();
	info!("Postgres connection-info: postgres://{}:<redacted>@{}:{}/lucid-frontier", ev("DB_USER"), ev("DB_ADDR"), ev("DB_PORT"));

	let mut cfg = tokio_postgres::Config::new();
	cfg.user(&ev("DB_USER"));
	cfg.password(ev("DB_PASSWORD"));
	cfg.host(&ev("DB_ADDR"));
	cfg.port(ev("DB_PORT").parse::<u16>().unwrap());
	cfg.dbname("lucid-frontier");
	cfg
}

pub fn create_db_pool() -> Pool {
	let pg_cfg = get_tokio_postgres_config();
	let mgr_cfg = ManagerConfig {
		recycling_method: RecyclingMethod::Fast,
		// when using "SET ROLE rls_obeyer", this was needed; it's not needed anymore, now that we use "SET LOCAL ROLE rls_obeyer" (since that restricts the change to just the current transaction)
		/*recycling_method: RecyclingMethod::Custom(formatdoc! {r#"
			SET SESSION AUTHORIZATION DEFAULT;
			-- or: RESET ROLE;
		"#}),*/
		//recycling_method: RecyclingMethod::Verified,
		//recycling_method: RecyclingMethod::Clean,
	};
	let mgr = Manager::from_config(pg_cfg, NoTls, mgr_cfg);
	//let pool_size = 1;
	//let pool_size = 2;
	let pool_size = 30;
	//let pool_size = 1050;
	let pool = Pool::builder(mgr).max_size(pool_size).runtime(Runtime::Tokio1).build().unwrap();
	pool
}
