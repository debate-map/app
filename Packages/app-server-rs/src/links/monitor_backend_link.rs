use std::net::SocketAddr;

use axum::{body::{Body}, Error, extract::{ws::{WebSocket, Message}, WebSocketUpgrade, Extension, ConnectInfo}, response::IntoResponse, body::HttpBody};
use flume::Receiver;
use futures::{sink::SinkExt, stream::{StreamExt, SplitSink, SplitStream}};
use hyper::{StatusCode, Response};
use once_cell::sync::Lazy;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tracing::error;

use crate::utils::{general::logging::LogEntry, type_aliases::{ABReceiver, ABSender}, mtx::mtx::{Mtx, MtxData}};

pub fn is_addr_from_pod(addr: &SocketAddr) -> bool {
    addr.ip().is_ipv4() && addr.ip().to_string().starts_with("10.")
}

pub async fn monitor_backend_link_handle_ws_upgrade(
    //Extension(s1): Extension<ABSender<LogEntry>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    ws: WebSocketUpgrade
) -> impl IntoResponse {
    if !is_addr_from_pod(&addr) {
        error!("/monitor-backend-link endpoint was called, but the caller was not an in-cluster pod! @callerIP:{}", addr.ip());
        let json = json!({"error": format!("This endpoint is only meant to be used for in-cluster callers (ie. pods) atm.")});
        let temp = Body::from(json.to_string()).boxed_unsync();
        return Response::builder().status(StatusCode::BAD_GATEWAY)
            .body(temp).unwrap().into_response();
    }

    //let r1 = s1.new_receiver();
    ws.on_upgrade(move |socket| handle_socket(socket, addr)).into_response()
    //ws.on_upgrade(move |socket| handle_socket(socket, r1, addr))
}

async fn handle_socket(socket: WebSocket, _addr: SocketAddr) {
    /*if !is_addr_from_pod(&addr) {
        error!("/monitor-backend-link endpoint was called, but the caller was not an in-cluster pod! @callerIP:{}", addr.ip());
        return;
    }*/
    
    let (sender, receiver) = socket.split();
    tokio::spawn(write(sender));
    tokio::spawn(read(receiver));
}

pub static MESSAGE_SENDER_TO_MONITOR_BACKEND: Lazy<(ABSender<Message_ASToMB>, ABReceiver<Message_ASToMB>)> = Lazy::new(|| {
    let (mut s1, r1): (ABSender<Message_ASToMB>, ABReceiver<Message_ASToMB>) = async_broadcast::broadcast(10000);
    s1.set_overflow(true);
    // we need to return both, else the receiver is dropped, and the channel closes
    (s1, r1)
});

async fn read(mut receiver: SplitStream<WebSocket>) {
    while let Some(Ok(msg)) = receiver.next().await {
        /*match msg {
            Text(json) => {
                
            },
            _ => {},
        }*/
    }
}
async fn write(mut sender: SplitSink<WebSocket, Message>) {
    let mut msg_receiver = MESSAGE_SENDER_TO_MONITOR_BACKEND.0.new_receiver();
    loop {
        //let next_entry = match log_entry_receiver.recv_async().await {
        //let next_entry = match log_entry_receiver.recv().await {
        let next_msg = match msg_receiver.recv().await {
            Ok(a) => a,
            Err(_) => break, // if unwrap fails, break loop (since senders are dead anyway)
        };

        //let next_entry_as_str = serde_json::to_string(&next_entry).unwrap_or_else(|_| "[failed to serialize LogEntry...]".to_string());
        let next_entry_as_str = serde_json::to_string(&next_msg).unwrap_or_else(|_| "[failed to serialize Message_ASToMB...]".to_string());

        // in any websocket error, break loop
        match sender.send(Message::Text(next_entry_as_str)).await {
            Ok(_res) => {},
            Err(err) => {
                error!("Websocket write-connection to monitor-backend errored:{err}");
                break;
            },
        };
    }
}

// section to keep synchronized with "app_server_rs_link.rs" in monitor-backend
// ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message_MBToAS {
    //TODO,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message_ASToMB {
    LogEntryAdded { entry: LogEntry },
    MtxEntryDone { mtx: MtxData },
}