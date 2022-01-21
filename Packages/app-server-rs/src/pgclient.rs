use std::{pin::Pin, env, time::{SystemTime, UNIX_EPOCH}, task::{Poll, Context}};

use bytes::Bytes;
use futures::{future, StreamExt, TryStreamExt, Sink, FutureExt, SinkExt};
use tokio_postgres::{NoTls, error::SqlState, Client, SimpleQueryMessage, SimpleQueryRow, CopyBothDuplex};

async fn q(client: &Client, query: &str) -> Vec<SimpleQueryRow> {
    let msgs = client.simple_query(query).await.unwrap();

    msgs.into_iter()
        .filter_map(|msg| match msg {
            SimpleQueryMessage::Row(row) => Some(row),
            _ => None,
        })
        .collect()
}

/**
 * There appear to be three ways to use replication slots:
 * 1) "CREATE_REPLICATION_SLOT" followed by "pg_catalog.pg_logical_slot_get_changes".
 * 2) "CREATE_REPLICATION_SLOT" followed by "START_REPLICATION" (with stream listener).
 * 3) Connecting to postgres pod through shell, then running "pg_recvlogical".
 * In this function, we use approach 2.
 */
pub async fn start_streaming_changes<'a>() -> Result<(), tokio_postgres::Error> {
    println!("Test1.5");

    // get connection info from env-vars
    let ev = |name| { env::var(name).unwrap() };
    println!("Connecting app-server-rs's pg-client to: postgres://{}:<redacted>@{}:{}/debate-map", ev("DB_USER"), ev("DB_ADDR"), ev("DB_PORT"));
    //let db_url = format!("postgres://{}:{}@{}:{}/debate-map", ev("DB_USER"), ev("DB_PASSWORD"), ev("DB_ADDR"), ev("DB_PORT"));
    let db_config = format!("user={} password={} host={} port={} dbname={} replication=database", ev("DB_USER"), ev("DB_PASSWORD"), ev("DB_ADDR"), ev("DB_PORT"), "debate-map");

    // Connect to the database.
    //let (client, connection) = tokio_postgres::connect("host=localhost port=3205 user=postgres replication=database", NoTls).await.unwrap();
    let (client, connection) = tokio_postgres::connect(&db_config, NoTls).await.unwrap();
    println!("Test2");

    // The connection object performs the actual communication with the database, so spawn it off to run on its own.
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });
    println!("Test3");

    // Now we can execute a simple statement that just returns its parameter.
    /*let rows = q(&client, "SELECT $1::TEXT", &[&"hello world"]).await.unwrap();
    // And then check that we got back the same string we sent over.
    let value: &str = rows[0].get(0);
    assert_eq!(value, "hello world");*/
    let rows = q(&client, "SELECT '123'").await;
    let value: &str = rows[0].get(0).unwrap();
    assert_eq!(value, "123");
    println!("Test4");

    //let slot_name = "slot";
    let slot_name = "slot_".to_owned() + &SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis().to_string();
    let slot_query = format!("CREATE_REPLICATION_SLOT {} TEMPORARY LOGICAL \"wal2json\"", slot_name);
    let lsn = q(&client, &slot_query).await[0]
        .get("consistent_point")
        .unwrap()
        .to_owned();

    // create transaction, and insert a value; we will attempt to read this from the other end (the replication-slot listener)
    /*client.query("BEGIN").await;
    let xid = q(&client, "SELECT txid_current()").await[0]
        .get("txid_current")
        .unwrap()
        .to_owned();
    q(&client, "INSERT INTO replication VALUES ('processed')").await;
    q(&client, "COMMIT").await;*/
    // insert a second row to generate unprocessed messages in the stream
    //q(&client, "INSERT INTO replication VALUES ('ignored')", &[]).await.unwrap();

    let query = format!("START_REPLICATION SLOT {} LOGICAL {}", slot_name, lsn);
    let duplex_stream = client.copy_both_simple::<bytes::Bytes>(&query).await.unwrap();
    let mut duplex_stream_pin = Box::pin(duplex_stream);
    /*let duplex_stream_pin_mut = Box::pin(&mut duplex_stream);
    let duplex_stream_pin_mut2 = Pin::new(&mut Box::new(duplex_stream));*/
    //let duplex_stream_pin_mut3 = Pin::new(&mut duplex_stream_pin);
    //let mut duplex_stream_pin_mut3 = duplex_stream_pin.as_mut();
    //let duplex_stream_pin_mut4 = Pin::new(&mut duplex_stream_pin);
    //let duplex_stream_pin_mut5 = duplex_stream_pin.as_mut();

    /*let expected = vec![
        format!("BEGIN {}", xid),
        "table public.replication: INSERT: i[text]:'processed'".to_string(),
        format!("COMMIT {}", xid),
    ];*/

    loop {
        //let event_res_opt = duplex_stream_pin_mut3.next().await;
        let event_res_opt = {
            let mut duplex_stream_pin_mut5 = duplex_stream_pin.as_mut();
            duplex_stream_pin_mut5.next().await
        };

        //if event_res_opt.is_none() { break; }
        // don't break, just continue; an empty result can just mean the timeout was hit (apparently each next() will resolve with None after X seconds, if there are no changes)
        if event_res_opt.is_none() { continue; }
        let event_res = event_res_opt.unwrap();
        if event_res.is_err() { continue }
        let event = event_res.unwrap();

        // see here for list of message-types: https://www.postgresql.org/docs/10/protocol-replication.html
        // Process only XLogData messages
        if event[0] == b'w' { // type: XLogData (WAL data, ie. change of data in db)
            println!("Got XLogData/data-change event:{:?}", event);
        } else if event[0] == b'k' { // keepalive message

            let lastByte = event.last().unwrap();
            let timeoutImminent = lastByte == &1;
            println!("Got keepalive message:{:x?} @timeoutImminent:{}", event, timeoutImminent);
            if timeoutImminent {
                let SECONDS_FROM_UNIX_EPOCH_TO_2000 = 946684800;
                let time_since_2000: u64 = (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_micros() - (SECONDS_FROM_UNIX_EPOCH_TO_2000 * 1000 * 1000)).try_into().unwrap();
                
                //let data_to_send: &'static [u8] = &[
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

                /*let mut context: &mut Context;
                future::poll_fn(|cx| {
                    context = cx;
                    Poll::Ready(())
                }).await;*/

                //future::poll_fn(|cx| ).await;
                println!("Trying to send response to keepalive message/warning!:{:x?}", buf);
                let mut next_step = 1;
                future::poll_fn(|cx| {
                    loop {
                        println!("Doing step:{}", next_step);
                        match next_step {
                            1 => { if let Poll::Pending = duplex_stream_pin.as_mut().poll_ready(cx) { return Poll::Pending }; }
                            2 => { duplex_stream_pin.as_mut().start_send(buf.clone()).unwrap(); },
                            3 => { if let Poll::Pending = duplex_stream_pin.as_mut().poll_flush(cx) { return Poll::Pending }; },
                            4 => { return Poll::Ready(()) },
                            _ => panic!(),
                        }
                        next_step += 1;
                    }
                }).await;
                println!("Sent response to keepalive message/warning!:{:x?}", buf);
                
                //duplex_stream_pinned.poll_complete().unwrap();
                //future::poll_fn(|cx| &).await;
            }
        }
    }

    // ensure we can continue issuing queries // can't after the refactor; by time we're here, connection must have closed
    //assert_eq!(q(&client, "SELECT 1").await[0].get(0), Some("1"));

    Ok(())
}