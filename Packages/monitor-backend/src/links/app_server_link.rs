
use std::time::Duration;

use rust_shared::async_graphql::{SimpleObject, Json};
use flume::Sender;
use futures_util::StreamExt;
use indexmap::IndexMap;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, self};
use rust_shared::tokio::{time, self};
use tracing::{debug, error, info, trace};
use rust_shared::url::Url;
use tokio_tungstenite::{tungstenite::{connect, Message}, connect_async};
use rust_shared::uuid::Uuid;

use crate::{GeneralMessage, utils::type_aliases::{ABSender, JSONValue}, store::storage::{AppStateWrapper, LQInstance_Partial}, links::app_server_types::{Message_ASToMB, LogEntry}};

pub async fn connect_to_app_server(app_state: AppStateWrapper, sender: ABSender<GeneralMessage>) {
    loop {
        tokio::time::sleep(Duration::from_secs(5)).await;

        let url = Url::parse("ws://dm-app-server.default.svc.cluster.local:5110/monitor-backend-link").unwrap();
        let connect_attempt_fut = connect_async(url);
        let (mut socket, response) = match time::timeout(Duration::from_secs(3), connect_attempt_fut).await {
            // if timeout happens, just ignore (there might have been local network glitch or something)
            Err(_err) => {
                error!("Timed out trying to connect to app-server...");
                continue;
            },
            Ok(connect_result) => {
                match connect_result {
                    Ok(a) => a,
                    Err(err) => {
                        error!("Couldn't connect to app-server websocket endpoint:{}", err);
                        continue;
                    }
                }
            },
        };
        info!("Connection made with app-server websocket endpoint. @response:{response:?}");

        /*match socket.write_message(Message::Text(json!({
            "action": "listen",
            "data": {
                "some": ["data1", "data2"]
            }
        }).to_string())) {
            Ok(_) => {},
            Err(err) => {
                debug!("Link with app-server lost:{}", err);
                return;
            },
        }*/

        loop {
            let msg = match socket.next().await {
                None => continue,
                Some(entry) => match entry {
                    Ok(msg) => msg,
                    Err(err) => {
                        error!("Error reading message from link with app-server:{}", err);
                        break;
                    }
                },
            };
            let msg_as_str = msg.into_text().unwrap();
            let msg: Message_ASToMB = match serde_json::from_str(&msg_as_str) {
                Ok(a) => a,
                Err(err) => {
                    error!("Got error converting message-string into Message_ASToMB. @msg_str:{msg_as_str} @err:{err}");
                    continue;
                }
            };

            match msg {
                Message_ASToMB::LogEntryAdded { entry } => {
                    //println!("Received log-entry:{}", msg_as_str);
                    match sender.broadcast(GeneralMessage::LogEntryAdded(entry)).await {
                        Ok(_) => {
                            //println!("Test1:{count}");
                            //println!("Test1");
                        },
                        Err(err) => error!("Cannot send log-entry; all receivers were dropped. @err:{err}"),
                    }
                },
                Message_ASToMB::MtxEntryDone { mtx } => {
                    trace!("Got mtx-result:{}", serde_json::to_string_pretty(&mtx).unwrap());

                    let mut mtx_results = app_state.mtx_results.write().await;
                    if let Some(existing_entry) = mtx_results.iter().enumerate().find(|(_, entry)| entry.id == mtx.id) {
                        let index = existing_entry.0;
                        mtx_results.remove(index);
                    }

                    mtx_results.push(mtx);
                    if mtx_results.len() > 5000 {
                        let entries_to_remove = mtx_results.len() - 5000;
                        mtx_results.drain(0..entries_to_remove);
                    }
                },
                Message_ASToMB::LQInstanceUpdated { table_name, filter, last_entries, watchers_count, deleting } => {
                    trace!("LQ-instance updated:{}", json!({
                        "table_name": table_name,
                        "filter": filter,
                        "last_entries": last_entries,
                        "watchers_count": watchers_count,
                        "deleting": deleting,
                    }).to_string());

                    let mut lqi_data = app_state.lqi_data.write().await;
                    let key = get_lq_instance_key(&table_name, &filter);
                    match deleting {
                        false => lqi_data.insert(key, LQInstance_Partial {
                            table_name,
                            filter,
                            last_entries: Json::from(last_entries),
                            entry_watcher_count: watchers_count as usize,
                        }),
                        true => lqi_data.remove(&key),
                    };
                }
            }
        }
    }
}

// from lq_instance.rs in app-server
fn get_lq_instance_key(table_name: &str, filter: &JSONValue) -> String {
    //format!("@table:{} @filter:{:?}", table_name, filter)
    json!({
        "table": table_name,
        "filter": filter,
    }).to_string()
}