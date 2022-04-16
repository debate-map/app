
use std::time::Duration;

use async_graphql::SimpleObject;
use flume::Sender;
use rust_macros::wrap_slow_macros;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::broadcast;
use tracing::{debug, error, info};
use url::Url;
use tokio_tungstenite::tungstenite::{connect, Message};

use crate::GeneralMessage;

wrap_slow_macros!{

// keep synced with struct in logging.rs (this one's the "mirror")
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
pub struct LogEntry {
    time: f64,
    level: String,
    span_name: String,
    target: String,
    message: String,
}

}

pub async fn connect_to_app_server_rs(sender: broadcast::Sender<GeneralMessage>) {
    //let interval = tokio::time::interval(Duration::from_secs(5));
    loop {
        //interval.tick().await; // first tick is immediate
        tokio::time::sleep(Duration::from_secs(5)).await;

        let (mut socket, response) = match connect(
            Url::parse("ws://dm-app-server-rs.default.svc.cluster.local:5110/monitor-backend-link").unwrap()
        ) {
            Ok(a) => a,
            Err(err) => {
                error!("Couldn't connect to app-server-rs websocket endpoint:{}", err);
                continue;
            }
        };
        info!("Connection made with app-server-rs websocket endpoint. @response:{response:?}");

        /*match socket.write_message(Message::Text(json!({
            "action": "listen",
            "data": {
                "some": ["data1", "data2"]
            }
        }).to_string())) {
            Ok(_) => {},
            Err(err) => {
                debug!("Link with app-server-rs lost:{}", err);
                return;
            },
        }*/

        loop {
            let msg = match socket.read_message() {
                Ok(msg) => msg,
                Err(err) => {
                    error!("Error reading message from link with app-server-rs:{}", err);
                    break;
                }
            };
            let msg_as_str = msg.into_text().unwrap();
            let log_entry = match serde_json::from_str(&msg_as_str) {
                Ok(a) => a,
                Err(err) => {
                    eprintln!("Got error converting message-string into LogEntry. @msg_str:{msg_as_str} @err:{err}");
                    continue;
                }
            };

            println!("Received log-entry:{}", msg_as_str);
            match sender.send(GeneralMessage::LogEntryAdded(log_entry)) {
                Ok(count) => {
                    println!("Test1:{count}");
                },
                Err(err) => println!("Cannot send log-entry; all receivers were dropped. @err:{err}"),
            }
        }
    }
}