use std::borrow::Borrow;
use std::error::Error as StdError;
use std::pin::Pin;
use std::task::Poll;

use anyhow::{anyhow, bail, Context, Error};
use bytes::Bytes;
use http_body_util::{BodyExt, Empty, Full};
use hyper::http::HeaderValue;
use hyper::rt::{Read, ReadBuf, ReadBufCursor, Write};
use hyper::upgrade::Upgraded;
use hyper::{http, Method, Request, Uri, Version};
use hyper_util::client::legacy::connect::{Connect, HttpConnector};
use hyper_util::client::legacy::Client;
use hyper_rustls::HttpsConnector;
use hyper_util::rt::TokioIo;
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::protocol::WebSocketConfig;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use hyper::body::Body;
use pin_project_lite::pin_project;

use crate::utils::k8s::upgrade;

/// Initiates an HTTPS connection to the URI specified within `request`, then immediately upgrades it to a WebSocket connection.
/// This is different from simply connecting to a websocket endpoint, and it's necessary to connect to certain k8s endpoints. (eg. `exec` for pods)
pub async fn upgrade_to_websocket<B: Body + Send + Unpin + std::fmt::Debug + 'static>(client: Client<HttpsConnector<HttpConnector>, B>, mut request: hyper::Request<B>) -> Result<WebSocketStream<TokioIo<Upgraded>>, Error>
    where
        <B as Body>::Data: std::marker::Send,
        <B as Body>::Error: Into<std::boxed::Box<(dyn StdError + std::marker::Send + Sync + 'static)>>
{
    // add various headers that are required by the websocket-upgrade process: https://stackoverflow.com/a/42334717
    //let uri = request.uri().clone();
    let headers = request.headers_mut();
    //headers.insert(http::header::HOST, uri.host().unwrap().parse().expect("valid header value")); // commented; link above says it's necessary, but doesn't seem to be (and not sure if this value is correct)
    headers.insert(http::header::CONNECTION, HeaderValue::from_static("Upgrade"));
    headers.insert(http::header::UPGRADE, HeaderValue::from_static("websocket"));
    headers.insert(http::header::SEC_WEBSOCKET_VERSION, HeaderValue::from_static("13"));
    let key = upgrade::sec_websocket_key();
    headers.insert(http::header::SEC_WEBSOCKET_KEY, key.parse().expect("valid header value"));
    // Use the binary subprotocol v4, to get JSON `Status` object in `error` channel (3).
    // There's no official documentation about this protocol, but it's described in [`k8s.io/apiserver/pkg/util/wsstream/conn.go`](https://git.io/JLQED).
    // There's a comment about v4 and `Status` object in [`kublet/cri/streaming/remotecommand/httpstream.go`](https://git.io/JLQEh).
    headers.insert(http::header::SEC_WEBSOCKET_PROTOCOL, HeaderValue::from_static(upgrade::WS_PROTOCOL));

    let res = client.request(request).await.context("Failed in client.request.")?;

    upgrade::verify_response(&res, &key).context("Failed to verify response.")?; //.map_err(Error::UpgradeConnection)?;
    match hyper::upgrade::on(res).await {
        Ok(upgraded) => {
            let upgraded_wrapped = TokioIo::new(upgraded);
            Ok(WebSocketStream::from_raw_socket(upgraded_wrapped, tokio_tungstenite::tungstenite::protocol::Role::Client, None).await)
        }
        /*Err(e) => Err(Error::UpgradeConnection(UpgradeConnectionError::GetPendingUpgrade(e))),*/
        Err(e) => bail!("Hit error: {:?}", e)
    }
}