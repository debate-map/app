use std::{env, time::{SystemTime, UNIX_EPOCH}, task::{Poll}};
use bytes::Bytes;
use futures::{future, StreamExt, Sink, ready};
use tokio_postgres::{NoTls, Client, SimpleQueryMessage, SimpleQueryRow, tls::NoTlsStream, Socket, Connection};

use crate::store::storage::Storage;

async fn q(client: &Client, query: &str) -> Vec<SimpleQueryRow> {
    let msgs = client.simple_query(query).await.unwrap();
    msgs.into_iter()
        .filter_map(|msg| match msg {
            SimpleQueryMessage::Row(row) => Some(row),
            _ => None,
        })
        .collect()
}

pub async fn create_client(for_replication: bool) -> (Client, Connection<Socket, NoTlsStream>) {
    // get connection info from env-vars
    let ev = |name| { env::var(name).unwrap() };
    println!("Connecting app-server-rs's pg-client to: postgres://{}:<redacted>@{}:{}/debate-map", ev("DB_USER"), ev("DB_ADDR"), ev("DB_PORT"));
    //let db_url = format!("postgres://{}:{}@{}:{}/debate-map", ev("DB_USER"), ev("DB_PASSWORD"), ev("DB_ADDR"), ev("DB_PORT"));
    let mut db_config = format!("user={} password={} host={} port={} dbname={}", ev("DB_USER"), ev("DB_PASSWORD"), ev("DB_ADDR"), ev("DB_PORT"), "debate-map");
    if for_replication {
        db_config += " replication=database";
    }

    // connect to the database
    let (client, connection) = tokio_postgres::connect(&db_config, NoTls).await.unwrap();
    (client, connection)
}

/**
 * There appear to be three ways to use replication slots:
 * 1) "CREATE_REPLICATION_SLOT" followed by "pg_logical_slot_get_changes()".
 * 2) "CREATE_REPLICATION_SLOT" followed by "START_REPLICATION" (with stream listener).
 * 3) Connecting to postgres pod through shell, then running "pg_recvlogical".
 * In this function, we use approach 2.
 */
pub async fn start_streaming_changes(client: Client, connection: Connection<Socket, NoTlsStream>, storage: Storage) -> Result<Client, tokio_postgres::Error> {
    // the connection object performs the actual communication with the database, so spawn it off to run on its own
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

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
        if event_res_opt.is_none() { break; }
        //if event_res_opt.is_none() { continue; }
        let event_res = event_res_opt.unwrap();
        if event_res.is_err() { continue }
        let event = event_res.unwrap();

        // see here for list of message-types: https://www.postgresql.org/docs/10/protocol-replication.html
        // type: XLogData (WAL data, ie. change of data in db)
        if event[0] == b'w' {
            println!("Got XLogData/data-change event:{:?}", event);
            let change = event;
            let change_collection = change["collection"];

            let guard = storage.lock();
            //let storage = guard.as_ref().unwrap();
            let storage = guard.unwrap();

            for (lq_key, lq_info) in storage.live_queries {
                if lq_key["collection"] != change_collection { continue; }
                // todo
                for change_listener in lq_info.change_listeners {
                    change_listener(change);
                }
            }
        }
        // type: keepalive message
        else if event[0] == b'k' {
            let last_byte = event.last().unwrap();
            let timeout_imminent = last_byte == &1;
            println!("Got keepalive message:{:x?} @timeout_imminent:{}", event, timeout_imminent);
            if timeout_imminent {
                // not sure if sending the client system's "time since 2000-01-01" is actually necessary, but lets do as postgres asks just in case
                const SECONDS_FROM_UNIX_EPOCH_TO_2000: u128 = 946684800;
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

                println!("Responding to keepalive message/warning... @response:{:x?}", buf);
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
}