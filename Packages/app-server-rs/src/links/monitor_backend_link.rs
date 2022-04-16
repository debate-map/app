use std::net::SocketAddr;

use axum::{body::{Body}, Error, extract::{ws::{WebSocket, Message}, WebSocketUpgrade, Extension, ConnectInfo}, response::IntoResponse, body::HttpBody};
use flume::Receiver;
use futures::{sink::SinkExt, stream::{StreamExt, SplitSink, SplitStream}};
use hyper::{StatusCode, Response};
use serde_json::json;
use tracing::error;

use crate::utils::general::logging::LogEntry;

pub fn is_addr_from_pod(addr: &SocketAddr) -> bool {
    addr.ip().is_ipv4() && addr.ip().to_string().starts_with("10.")
}

pub async fn monitor_backend_link_handle_ws_upgrade(
    Extension(r1): Extension<Receiver<LogEntry>>,
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

    ws.on_upgrade(move |socket| handle_socket(socket, r1, addr)).into_response()
    //ws.on_upgrade(move |socket| handle_socket(socket, r1, addr))
}

async fn handle_socket(socket: WebSocket, log_entry_receiver: Receiver<LogEntry>, _addr: SocketAddr) {
    /*if !is_addr_from_pod(&addr) {
        error!("/monitor-backend-link endpoint was called, but the caller was not an in-cluster pod! @callerIP:{}", addr.ip());
        return;
    }*/
    
    let (sender, receiver) = socket.split();
    tokio::spawn(write(sender, log_entry_receiver));
    tokio::spawn(read(receiver));
}

async fn read(mut receiver: SplitStream<WebSocket>) {
    while let Some(Ok(message)) = receiver.next().await {
        // do nothing
    }
}
async fn write(mut sender: SplitSink<WebSocket, Message>, log_entry_receiver: Receiver<LogEntry>) {
    loop {
        let next_entry = match log_entry_receiver.recv_async().await {
            Ok(a) => a,
            Err(_) => break, // if unwrap fails, break loop (since senders are dead anyway)
        };

        let next_entry_as_str = serde_json::to_string(&next_entry).unwrap_or_else(|_| "[failed to serialize LogEntry...]".to_string());

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