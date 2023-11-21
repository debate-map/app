use std::{env, time::{SystemTime, UNIX_EPOCH, Duration}, task::{Poll}, cmp::max};
use rust_shared::{tokio_postgres, bytes::{Bytes, self}, tokio, utils::type_aliases::JSONValue, serde_json, indoc::formatdoc, once_cell::sync::Lazy};
use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod, Runtime, PoolConfig};
use rust_shared::{futures, axum, tower, tower_http};
use futures::{future, StreamExt, Sink, ready};
use rust_shared::tokio::{join, select};
use rust_shared::tokio_postgres::{NoTls, Client, SimpleQueryMessage, SimpleQueryRow, tls::NoTlsStream, Socket, Connection};
use rust_shared::tokio_postgres::types::{PgLsn};
use tracing::{info, debug, error, trace, warn};
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::postgres_protocol::message::backend::{LogicalReplicationMessage, ReplicationMessage};
use rust_shared::tokio_postgres::replication::LogicalReplicationStream;

use crate::{store::{live_queries::{LQStorageArc}, storage::AppStateArc}, utils::{db::pg_stream_parsing::LDChange}};

pub fn start_pgclient_with_restart(app_state: AppStateArc) {
    let _handler = tokio::spawn(async move {
        let mut errors_hit = 0;
        while errors_hit < 1000 {
            let (client_replication, connection_replication) = create_client_advanced(true).await;
            let result = start_streaming_changes(client_replication, connection_replication, app_state.live_queries.clone()).await;
            match result {
                Ok(result) => {
                    //println!("PGClient loop ended for some reason. Result:{:?}", result);
                    error!("PGClient loop ended for some reason; restarting shortly. Result:{:?}", result);
                },
                Err(err) => {
                    error!("PGClient loop had error; restarting shortly. @error:{:?}", err);
                    errors_hit += 1;
                }
            };
            tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
        }
    });
}

async fn q(client: &Client, query: &str) -> Vec<SimpleQueryRow> {
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
    let ev = |name| { env::var(name).unwrap() };
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
async fn create_client_advanced(for_replication: bool) -> (Client, Connection<Socket, NoTlsStream>) {
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
    let pool_size = 30;
    //let pool_size = 1050;
    let pool = Pool::builder(mgr).max_size(pool_size).runtime(Runtime::Tokio1).build().unwrap();
    pool
}

/*struct LogicalReplicationStreamWrapper(LogicalReplicationStream);
impl Stream for LogicalReplicationStreamWrapper {
    type Item = Result<ReplicationMessage<LogicalReplicationMessage>, Error>;
    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.project();
        let result = this.0.poll_next(cx);
        if (result.is_ready()) {
            info!("LogicalReplicationStreamWrapper::poll_next result:{:?}", result);
        }
        result
    }
}*/

/**
 * There appear to be three ways to use replication slots:
 * 1) `CREATE_REPLICATION_SLOT` followed by `pg_logical_slot_get_changes()`.
 * 2) `CREATE_REPLICATION_SLOT` followed by `START_REPLICATION` (with stream listener).
 * 3) Connecting to postgres pod through shell, then running `pg_recvlogical`.
 * In this function, we use approach 2.
 */
pub async fn start_streaming_changes(
    client: Client,
    connection: Connection<Socket, NoTlsStream>,
    storage_wrapper: LQStorageArc
) -> Result<Client, Error> {
//) -> Result<(Client, Connection<Socket, NoTlsStream>), tokio_postgres::Error> {
    info!("Starting pgclient::start_streaming_changes...");

    // the connection object performs the actual communication with the database, so spawn it off to run on its own
    let fut1 = tokio::spawn(async move {
        connection.await
    });

    let fut2 = tokio::spawn(async move {
        // now we can execute a simple statement just to confirm the connection was made
        // commented for now; LogicalReplicationStream expects all messages with client to be replication messages, so crashes if we run this test-query
        /*let rows = q(&client, "SELECT '123'").await;
        assert_eq!(rows[0].get(0).unwrap(), "123", "Simple data-free postgres query failed; something is wrong.");*/

        //let slot_name = "slot";
        let slot_name = "slot_".to_owned() + &SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis().to_string();
        //let slot_query = format!("CREATE_REPLICATION_SLOT {} TEMPORARY LOGICAL \"wal2json\"", slot_name);
        let slot_query = format!("CREATE_REPLICATION_SLOT {} TEMPORARY LOGICAL \"pgoutput\" NOEXPORT_SNAPSHOT", slot_name);
        let lsn = q(&client, &slot_query).await[0].get("consistent_point").unwrap().to_owned();

        client.simple_query("DROP PUBLICATION IF EXISTS dm_app_server_main").await.unwrap();
        client.simple_query("CREATE PUBLICATION dm_app_server_main FOR ALL TABLES").await.unwrap();

        //let query = format!("START_REPLICATION SLOT {} LOGICAL {}", slot_name, lsn);
        let query = format!("START_REPLICATION SLOT {} LOGICAL {} (\"proto_version\" '1', \"publication_names\" 'dm_app_server_main')", slot_name, lsn);
        
        /*let duplex_stream = client.copy_both_simple::<bytes::Bytes>(&query).await.unwrap();
        let mut duplex_stream_pin = Box::pin(duplex_stream);*/

        let stream_raw = client.copy_both_simple(&query).await.unwrap();
        let mut stream = Box::pin(LogicalReplicationStream::new(stream_raw));

        let mut wal_pos_last_processed: u64 = 0;

        loop {
            let event_res_opt = stream.as_mut().next().await;
            if event_res_opt.is_none() {
                info!("Duplex-stream from pgclient returned a None; breaking listen loop. (parent should spawn new connection soon)");
                break;
            }
            let event_res = event_res_opt.unwrap();
            let event = match event_res {
                Ok(event) => event,
                Err(err) => {
                    warn!("Duplex-stream from pgclient returned an error; resuming listen loop. @error:{:?}", err);
                    // if error is of type that signifies that the the connection has closed, just break the loop
                    if err.is_closed() { break; }
                    continue;
                },
            };

            //let event_bytes = event_res.unwrap();
            //let event: LogicalReplicationMessage = serde_json::from_slice(&event_bytes).unwrap();
            //let event = event_res.unwrap();

            use ReplicationMessage::*;
            use LogicalReplicationMessage::*;
            // see here for list of message-types: https://www.postgresql.org/docs/10/protocol-replication.html
            match event {
                // type: XLogData (WAL data, ie. change of data in db)
                XLogData(body) => {
                    wal_pos_last_processed = max(wal_pos_last_processed, body.wal_end());
                    let core_data = body.into_data();
                    info!("Got XLogData/data-change event. @wal_pos_last_processed:{}", wal_pos_last_processed);
                    match core_data {
                        // todo: probably rework my code to just use the existing LogicalReplicationMessage struct, rather than this custom LDChange
                        Insert(body2) => {
                            info!("Got insert event:{:?}", body2);
                            /*let change = LDChange {
                                table: self.lq_key.table_name.clone(),
                                kind: "insert".to_owned(),
                                columnnames: Some(new_data.keys().map(|a| a.clone()).collect()),
                                columnvalues: Some(new_data.values().map(|a| a.clone()).collect()),
                                // marking the type as "unknown" is fine; the type is only needed when converting from-lds data into proper `JSONValue`s
                                columntypes: Some(new_data.keys().map(|_| "unknown".to_owned()).collect()),
                                oldkeys: None,
                                schema: "".to_owned(),
                            };
                            storage_wrapper.notify_of_ld_change(change).await;*/
                        },
                        Update(body2) => {
                            info!("Got update event:{:?}", body2);
                            /*let change = LDChange {
                                table: self.lq_key.table_name.clone(),
                                kind: "update".to_owned(),
                                columnnames: Some(new_data.keys().map(|a| a.clone()).collect()),
                                columnvalues: Some(new_data.values().map(|a| a.clone()).collect()),
                                // marking the type as "unknown" is fine; the type is only needed when converting from-lds data into proper `JSONValue`s
                                columntypes: Some(new_data.keys().map(|_| "unknown".to_owned()).collect()),
                                oldkeys: None,
                                schema: "".to_owned(),
                            };
                            storage_wrapper.notify_of_ld_change(change).await;*/
                        },
                        Delete(body2) => {
                            info!("Got delete event:{:?}", body2);
                            /*let change = LDChange {
                                table: body2.,
                                kind: "delete".to_owned(),
                                columnnames: Some(new_data.keys().map(|a| a.clone()).collect()),
                                columnvalues: Some(new_data.values().map(|a| a.clone()).collect()),
                                // marking the type as "unknown" is fine; the type is only needed when converting from-lds data into proper `JSONValue`s
                                columntypes: Some(new_data.keys().map(|_| "unknown".to_owned()).collect()),
                                oldkeys: None,
                                schema: "".to_owned(),
                            };
                            storage_wrapper.notify_of_ld_change(change).await;*/
                        },
                        // ignore all other message-types
                        enum_type => {
                            info!("Got other event: {:?}", enum_type);
                        },
                    }
                },
                // type: keepalive message
                PrimaryKeepAlive(data) => {
                    let should_send_response = data.reply() == 1;
                    info!("Got keepalive message:{:x?} @should_send_response:{}", data, should_send_response);

                    // todo: someday probably use a timer to send keepalive messages to server proactively, since in some cases server warning can come too late (https://github.com/sfackler/rust-postgres/pull/696#discussion_r789698737)
                    if should_send_response {
                        debug!("Responding to keepalive message/warning... @wal_pos_last_processed:{}", wal_pos_last_processed);
                        let lsn = PgLsn::from(wal_pos_last_processed);
                        let ts: i64 = PG_EPOCH.elapsed().unwrap().as_micros().try_into().unwrap();
                        let request_server_response = 1; // If 1, the client requests the server to reply to this message immediately. This can be used to ping the server, to test if the connection is still healthy.
                        stream.as_mut().standby_status_update(lsn, lsn, lsn, ts, request_server_response).await?;
                    }
                },
                _ => debug!("Got unknown replication event:{:?}", event),
            }
        }

        Ok(client)
        /*let connection = join!(handle).0.unwrap();
        Ok((client, connection))*/
    });

    select! {
        fut1_result_in_join_result = fut1 => {
            match fut1_result_in_join_result {
                Err(join_err) => Err(Error::new(join_err)), // recast the join error as our main error
                Ok(fut1_result) => match fut1_result {
                    Err(err) => {
                        error!("Connection error in base connection-thread of pgclient::start_streaming_changes: {}", err);
                        Err(Error::new(err))
                    },
                    Ok(_) => Err(anyhow!("Base connection-thread of start_streaming_changes ended for some reason; returning, so can be restarted.")),
                },
            }
        },
        fut2_result_in_join_result = fut2 => {
            match fut2_result_in_join_result {
                Err(join_err) => Err(Error::new(join_err)), // recast the join error as our main error
                Ok(fut2_result) => fut2_result,
            }
        },
    }
}

/// Postgres epoch is 2000-01-01T00:00:00Z
static PG_EPOCH: Lazy<SystemTime> = Lazy::new(|| UNIX_EPOCH + Duration::from_secs(946_684_800));