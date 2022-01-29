use std::{env, time::{SystemTime, UNIX_EPOCH}, task::{Poll}};
use bytes::Bytes;
use futures::{future, StreamExt, Sink, ready};
use tokio::join;
use tokio_postgres::{NoTls, Client, SimpleQueryMessage, SimpleQueryRow, tls::NoTlsStream, Socket, Connection};

use crate::{store::storage::StorageWrapper, utils::type_aliases::JSONValue};

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
pub async fn start_streaming_changes(
    client: Client,
    connection: Connection<Socket, NoTlsStream>,
    storage_wrapper: StorageWrapper
) -> Result<Client, tokio_postgres::Error> {
//) -> Result<(Client, Connection<Socket, NoTlsStream>), tokio_postgres::Error> {
    // the connection object performs the actual communication with the database, so spawn it off to run on its own
    let handle = tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
        //return connection;
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
            //let event_as_str = std::str::from_utf8(&*event).unwrap();
            /*let event_as_str = format!("{:?}", event); // format is more reliable (not all bytes need to be valid utf-8 to be stringified this way)
            let change_json_str = event_as_str[event_as_str.find("{")..].to_string();*/
            let u8_code_for_left_curly_bracket = "{".as_ptr() as u8; // "{" = 93
            println!("Bytes:{}", event.iter().map(|a| a.to_string()).collect::<Vec<String>>().join(","));
            //let first_byte_of_json_section = event.iter().position(|a| *a == u8_code_for_left_curly_bracket).unwrap();
            //let first_byte_of_json_section = event.iter().position(|a| a.to_string() == "93").unwrap();
            let first_byte_of_json_section = event.iter().position(|a| *a == b'{').unwrap();
            let json_section_bytes = &event[first_byte_of_json_section..];
            let json_section_str = std::str::from_utf8(json_section_bytes).unwrap();
            println!("JSON section(@length:{}):{}", json_section_str.len(), json_section_str);
            
            /*
            example json:
            {
                "change": [
                    {
                        "kind":"update",
                        "schema":"app_public",
                        "table":"globalData",
                        "columnnames":["extras","id"],
                        "columntypes":["jsonb","text"],
                        "columnvalues":[
                            "{\"dbReadOnly\": false, \"dbReadOnly_message\": \"test123\"}","main"
                        ],
                        "oldkeys":{
                            "keynames":["id"],
                            "keytypes":["text"],
                            "keyvalues":["main"]
                        }
                    }
                ]
            }
            */
            let data: JSONValue = serde_json::from_str(json_section_str).unwrap();
            let change = &data["change"][0];
            let change_table = change["table"].as_str().unwrap();

            let mut storage = storage_wrapper.lock().await;
            let mut1 = storage.live_queries.iter_mut();
            for (lq_key, lq_info) in mut1 {
                let lq_key_json: JSONValue = serde_json::from_str(lq_key).unwrap();
                if lq_key_json["table"].as_str().unwrap() != change_table { continue; }
                /*for (stream_id, change_listener) in lq_info.change_listeners.iter_mut() {
                    change_listener(&lq_info.last_entries);
                }*/
                lq_info.on_table_changed(&change);
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
    /*let connection = join!(handle).0.unwrap();
    Ok((client, connection))*/
}