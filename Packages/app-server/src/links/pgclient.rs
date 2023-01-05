use std::{env, time::{SystemTime, UNIX_EPOCH}, task::{Poll}};
use rust_shared::{tokio_postgres, bytes::{Bytes, self}, tokio, utils::type_aliases::JSONValue, serde_json, indoc::formatdoc};
use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod, Runtime, PoolConfig};
use rust_shared::{futures, axum, tower, tower_http};
use futures::{future, StreamExt, Sink, ready};
use rust_shared::tokio::{join, select};
use rust_shared::tokio_postgres::{NoTls, Client, SimpleQueryMessage, SimpleQueryRow, tls::NoTlsStream, Socket, Connection};
use tracing::{info, debug, error, trace};
use rust_shared::anyhow::{anyhow, Error};

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
            SELECT 1
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
        let rows = q(&client, "SELECT '123'").await;
        assert_eq!(rows[0].get(0).unwrap(), "123", "Simple data-free postgres query failed; something is wrong.");

        //let slot_name = "slot";
        let slot_name = "slot_".to_owned() + &SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis().to_string();
        let slot_query = format!("CREATE_REPLICATION_SLOT {} TEMPORARY LOGICAL \"wal2json\"", slot_name);
        let lsn = q(&client, &slot_query).await[0].get("consistent_point").unwrap().to_owned();

        let query = format!("START_REPLICATION SLOT {} LOGICAL {}", slot_name, lsn);
        let duplex_stream = client.copy_both_simple::<bytes::Bytes>(&query).await.unwrap();
        let mut duplex_stream_pin = Box::pin(duplex_stream);

        loop {
            let event_res_opt = duplex_stream_pin.as_mut().next().await;
            if event_res_opt.is_none() {
                info!("Duplex-stream from pgclient returned a None; breaking listen loop. (parent should spawn new connection soon)");
                break;
            }
            //if event_res_opt.is_none() { continue; }
            let event_res = event_res_opt.unwrap();
            if event_res.is_err() { continue }
            let event = event_res.unwrap();

            // see here for list of message-types: https://www.postgresql.org/docs/10/protocol-replication.html
            // type: XLogData (WAL data, ie. change of data in db)
            if event[0] == b'w' {
                debug!("Got XLogData/data-change event:{:?}", event);
                //let event_as_str = std::str::from_utf8(&*event).unwrap();
                //let event_as_str = format!("{:?}", event); // format is more reliable (not all bytes need to be valid utf-8 to be stringified this way)
                let event_as_str_cow = String::from_utf8_lossy(&*event);
                let event_as_str = event_as_str_cow.as_ref();
                const START_OF_CHANGE_JSON: &str = "{\"change\":[";
                
                /*let event_as_str_bytes = event_as_str.as_bytes();
                let idx = event_as_str.find("substring to match").unwrap();
                let substring_bytes = &event_as_str_bytes[idx..];
                let json_section_str = String::from_utf8(substring_bytes.to_vec()).unwrap();*/
                let json_section_str = START_OF_CHANGE_JSON.to_owned() + event_as_str.split_once(START_OF_CHANGE_JSON).unwrap().1;
                debug!("JSON section(@length:{}):{}", json_section_str.len(), json_section_str);
                
                // see bottom of storage.rs for example json-data
                let data: JSONValue = serde_json::from_str(json_section_str.as_str()).unwrap();
                for change_raw in data["change"].as_array().unwrap() {
                    let change: LDChange = serde_json::from_value(change_raw.clone()).unwrap();
                    storage_wrapper.notify_of_ld_change(change).await;
                }
            }
            // type: keepalive message
            else if event[0] == b'k' {
                let last_byte = event.last().unwrap();
                let timeout_imminent = last_byte == &1;
                debug!("Got keepalive message:{:x?} @timeout_imminent:{}", event, timeout_imminent);
                if timeout_imminent {
                    // not sure if sending the client system's "time since 2000-01-01" is actually necessary, but lets do as postgres asks just in case
                    const SECONDS_FROM_UNIX_EPOCH_TO_2000: u128 = 946_684_800;
                    let time_since_2000: u64 = (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_micros() - (SECONDS_FROM_UNIX_EPOCH_TO_2000 * 1000 * 1000)).try_into().unwrap();
                    
                    // see here for format details: https://www.postgresql.org/docs/10/protocol-replication.html
                    let mut data_to_send: Vec<u8> = vec![];
                    // Byte1('r'); Identifies the message as a receiver status update.
                    data_to_send.extend_from_slice(&[114]); // "r" in ascii
                    // The location of the last WAL byte + 1 received and written to disk in the standby.
                    data_to_send.extend_from_slice(&[0, 0, 0, 0, 0, 0, 0, 0]);
                    // The location of the last WAL byte + 1 flushed to disk in the standby.
                    data_to_send.extend_from_slice(&[0, 0, 0, 0, 0, 0, 0, 0]);
                    // The location of the last WAL byte + 1 applied in the standby.
                    data_to_send.extend_from_slice(&[0, 0, 0, 0, 0, 0, 0, 0]);
                    // The client's system clock at the time of transmission, as microseconds since midnight on 2000-01-01.
                    //0, 0, 0, 0, 0, 0, 0, 0,
                    data_to_send.extend_from_slice(&time_since_2000.to_be_bytes());
                    // Byte1; If 1, the client requests the server to reply to this message immediately. This can be used to ping the server, to test if the connection is still healthy.
                    data_to_send.extend_from_slice(&[1]);

                    let buf = Bytes::from(data_to_send);

                    debug!("Responding to keepalive message/warning... @response:{:x?}", buf);
                    let mut next_step = 1;
                    future::poll_fn(|cx| {
                        loop {
                            match next_step {
                                1 => { ready!(duplex_stream_pin.as_mut().poll_ready(cx)).unwrap(); }
                                2 => { duplex_stream_pin.as_mut().start_send(buf.clone()).unwrap(); },
                                3 => { ready!(duplex_stream_pin.as_mut().poll_flush(cx)).unwrap(); },
                                4 => { return Poll::Ready(()) },
                                _ => panic!(),
                            }
                            next_step += 1;
                        }
                    }).await;
                }
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