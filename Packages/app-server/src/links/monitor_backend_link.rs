use std::net::SocketAddr;

use axum::{
	body::HttpBody,
	extract::{
		ws::{Message, WebSocket},
		ConnectInfo, Extension, WebSocketUpgrade,
	},
	response::IntoResponse,
	Error,
};
use futures::{
	sink::SinkExt,
	stream::{SplitSink, SplitStream, StreamExt},
};
use rust_shared::flume::Receiver;
use rust_shared::hyper::{Response, StatusCode};
use rust_shared::once_cell::sync::Lazy;
use rust_shared::serde_json::json;
use rust_shared::{
	axum, futures,
	http_body_util::{BodyExt, Full},
	links::app_server_to_monitor_backend::Message_ASToMB,
	tower, tower_http,
};
use rust_shared::{
	serde::{Deserialize, Serialize},
	serde_json, tokio,
	utils::type_aliases::JSONValue,
};
use tracing::{error, warn};

use crate::utils::type_aliases::{ABReceiver, ABSender};

pub fn is_addr_from_pod(addr: &SocketAddr) -> bool {
	addr.ip().is_ipv4() && addr.ip().to_string().starts_with("10.")
}
pub fn message_of_bad_gateway_for_non_pod_caller(endpoint_name: &str, addr: &SocketAddr) -> String {
	error!("The endpoint \"{endpoint_name}\" was called, but the caller was not an in-cluster pod! @callerIP:{}", addr.ip());
	let body_json_val = json!({"error": format!("This endpoint is only meant to be used for in-cluster callers (ie. pods) atm.")});
	let message = body_json_val.to_string();
	return message;
}
pub fn http_response_of_bad_gateway_for_non_pod_caller(endpoint_name: &str, addr: &SocketAddr) -> Response<axum::body::Body> {
	let message = message_of_bad_gateway_for_non_pod_caller(endpoint_name, addr);
	let body = axum::body::Body::from(message).boxed_unsync();
	//let body = Full::from(message);
	Response::builder().status(StatusCode::BAD_GATEWAY).body(body).unwrap().into_response()
}
/*pub fn axum_response_of_bad_gateway_for_non_pod_caller(endpoint_name: &str, addr: &SocketAddr) -> Response<axum::body::Body> {
	let message = message_of_bad_gateway_for_non_pod_caller(endpoint_name, addr);
	(StatusCode::BAD_GATEWAY, message).into_response()
}*/

pub async fn monitor_backend_link_handle_ws_upgrade(
	//Extension(s1): Extension<ABSender<LogEntry>>,
	ConnectInfo(addr): ConnectInfo<SocketAddr>,
	ws: WebSocketUpgrade,
) -> impl IntoResponse {
	if !is_addr_from_pod(&addr) {
		return http_response_of_bad_gateway_for_non_pod_caller("/monitor-backend-link", &addr);
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
	while let Some(Ok(_msg)) = receiver.next().await {
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
				// only warn, since this is likely to just be a case where the app-server is being re-deployed
				warn!("Websocket write-connection to monitor-backend errored:{err}");
				break;
			},
		};
	}
}
