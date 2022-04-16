
use std::time::Duration;

use serde_json::json;
use tracing::{debug, error, info};
use url::Url;
use tokio_tungstenite::tungstenite::{connect, Message};

pub async fn connect_to_app_server_rs() {
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
            println!("Received log-entry:{}", msg);
            // todo: transfer this to client frontend or something
        }
    }
}