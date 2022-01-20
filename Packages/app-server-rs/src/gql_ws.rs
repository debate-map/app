use axum::{
    extract::{
         ws::{Message, WebSocket, WebSocketUpgrade},
         Extension,
    },
    response::{IntoResponse}, body::Body, http::Request,
};
use futures::{stream::StreamExt, SinkExt};
use std::{
    sync::{Arc},
};

type AppState = crate::AppState;

pub async fn gql_websocket_handler(ws: WebSocketUpgrade, Extension(state): Extension<Arc<AppState>>) -> impl IntoResponse {
    println!("Got websocket request-type on /graphql path.");

    ws
    // tell client that we support the graphql-ws (and such) protocols (else it will immediately disconnect)
        .protocols(["graphql-ws", "graphql-transport-ws"])
        .on_upgrade(|socket| websocket(socket, state))
}
/*pub async fn gql_websocket_handler(request: Request<Body>, Extension(state): Extension<Arc<AppState>>) -> impl IntoResponse {
    match request {
        WebSocketUpgrade(ws) => {
            ws.on_upgrade(|socket| websocket(socket, state))

        },
        _ => return,
    };
}*/
/*pub async fn gql_other_handler(request: Request<Body>, Extension(state): Extension<Arc<AppState>>) -> impl IntoResponse {
    println!("Got other request-type on /graphql path.");
}*/

async fn websocket(stream: WebSocket, _state: Arc<AppState>) {
    // By splitting we can send and receive at the same time.
    let (mut sender, mut receiver) = stream.split();

    // test
    let msg1 = receiver.next().await;
    println!("Got 1st message! (gql) @msg1:{:?}", msg1);

    if sender.send(Message::Text("First websocket response (needed for ws to not be closed)".to_string())).await.is_err() {
        println!("Client disconnected, from error during send of initial response");
        return;
    }
    println!("Got past sending of initial response.");

    while let Some(message_raw) = receiver.next().await {
        println!("Got message_raw:{:?}", message_raw);
        let message = if let Ok(message_temp) = message_raw {
            message_temp
        } else {
            println!("Client disconnected, early. @message_raw:{:?}", message_raw);
            // client disconnected
            return;
        };
        
        if let Message::Text(msg) = message {
            println!("Got text message: {:?}", &msg)
        } else if let Message::Binary(msg) = message {
            println!("Got binary message: {:?}", &msg)
        } else if let Message::Ping(msg) = message {
            println!("Got ping message: {:?}", &msg)
        } else if let Message::Pong(msg) = message {
            println!("Got pong message: {:?}", &msg)
        } else if let Message::Close(msg) = message {
            println!("Got close message: {:?}", &msg)
        }

        /*if socket.send(msg).await.is_err() {
            println!("Client disconnected, from error during send of response");
            // client disconnected
            return;
        }*/
    }

    println!("Websocket handler closed.")
}