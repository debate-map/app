use std::borrow::Borrow;

use anyhow::{anyhow, Error, bail};
use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::http::HeaderValue;
use hyper::rt::{Read, ReadBuf, ReadBufCursor, Write};
use hyper::{http, Request, Method, Uri};
use hyper_util::client::legacy::connect::{Connect, HttpConnector};
use hyper_util::client::legacy::Client;
use hyper_rustls::HttpsConnector;
use tokio_tungstenite::WebSocketStream;
use hyper::body::Body;

use crate::utils::k8s::upgrade;

/// Initiates an HTTPS connection to the URI specified within `request`, then immediately upgrades it to a WebSocket connection.
/// This is different from simply connecting to a websocket endpoint, and it's necessary to connect to certain k8s endpoints. (eg. `exec` for pods)
pub async fn upgrade_to_websocket(client: Client<HttpsConnector<HttpConnector>, Full<Bytes>>, request: hyper::Request<Full<Bytes>>) -> Result<WebSocketStream<UpgradedWrapper>, Error> {
    let (mut parts, body) = request.into_parts();
    parts.headers.insert(http::header::CONNECTION, HeaderValue::from_static("Upgrade"));
    parts.headers.insert(http::header::UPGRADE, HeaderValue::from_static("websocket"));
    parts.headers.insert(http::header::SEC_WEBSOCKET_VERSION, HeaderValue::from_static("13"));
    let key = upgrade::sec_websocket_key();
    parts.headers.insert(http::header::SEC_WEBSOCKET_KEY, key.parse().expect("valid header value"));
    // Use the binary subprotocol v4, to get JSON `Status` object in `error` channel (3).
    // There's no official documentation about this protocol, but it's described in
    // [`k8s.io/apiserver/pkg/util/wsstream/conn.go`](https://git.io/JLQED).
    // There's a comment about v4 and `Status` object in
    // [`kublet/cri/streaming/remotecommand/httpstream.go`](https://git.io/JLQEh).
    parts.headers.insert(http::header::SEC_WEBSOCKET_PROTOCOL, HeaderValue::from_static(upgrade::WS_PROTOCOL));

    let req = Request::from_parts(parts, body);

    //let client = hyper::Client::new();
    let mut req_final = hyper::Request::builder()
        .method(req.method())
        .uri(req.uri());
    {
        //req_final.headers_mut().replace(req.headers_mut()); // this doesn't work fsr
        let headers = req_final.headers_mut().unwrap();
        //headers.extend(req.headers().iter());
        for (key, value) in req.headers().iter() {
            headers.insert(key, value.clone());
        }
    }
    let req_final = req_final
        .body(req.into_body())?;

    //let res = client.get(parts.uri.to_string()).headers(parts.headers).body(body).send().await?;
    //let res = client.get(Request::from_parts(parts, Body::from(body)));
    let res = client.request(req_final).await?;

    //let res_body_read = Full::from(res.into_body());
    let (res_parts, body) = res.into_parts();
    let bytes = body.collect().await?.to_bytes();
    let res_body_read = Full::from(bytes);
    let res_read = hyper::Response::from_parts(res_parts, res_body_read);

    upgrade::verify_response(&res_read, &key)?; //.map_err(Error::UpgradeConnection)?;
    match hyper::upgrade::on(res_read).await {
        Ok(upgraded) => {
            let upgraded_wrapped = UpgradedWrapper::new(upgraded);
            Ok(WebSocketStream::from_raw_socket(upgraded_wrapped, tokio_tungstenite::tungstenite::protocol::Role::Client, None).await)
        }

        /*Err(e) => Err(Error::UpgradeConnection(UpgradeConnectionError::GetPendingUpgrade(e))),*/
        Err(e) => bail!("Hit error: {:?}", e)
    }
}

// create wrapper struct that hold the Upgraded from hyper, and makes it implement the AsyncRead and AsyncWrite traits
// this is necessary because the Upgraded struct from hyper (v1+) does not implement these traits
pub struct UpgradedWrapper {
    inner: hyper::upgrade::Upgraded
}
impl UpgradedWrapper {
    fn new(inner: hyper::upgrade::Upgraded) -> Self {
        Self { inner }
    }
}
impl tokio::io::AsyncRead for UpgradedWrapper {
    fn poll_read(self: std::pin::Pin<&mut Self>, cx: &mut std::task::Context<'_>, buf: &mut tokio::io::ReadBuf) -> std::task::Poll<std::io::Result<()>> {
        let mut buf2_ref = buf.filled_mut();
        let mut buf3: hyper::rt::ReadBuf = ReadBuf::new(&mut buf2_ref);
        let cursor = ReadBuf::unfilled(&mut buf3);
        std::pin::Pin::new(&mut self.get_mut().inner).poll_read(cx, cursor)
    }
}
impl tokio::io::AsyncWrite for UpgradedWrapper {
    fn poll_write(self: std::pin::Pin<&mut Self>, cx: &mut std::task::Context<'_>, buf: &[u8]) -> std::task::Poll<std::io::Result<usize>> {
        std::pin::Pin::new(&mut self.get_mut().inner).poll_write(cx, buf)
    }
    fn poll_flush(self: std::pin::Pin<&mut Self>, cx: &mut std::task::Context<'_>) -> std::task::Poll<std::io::Result<()>> {
        std::pin::Pin::new(&mut self.get_mut().inner).poll_flush(cx)
    }
    fn poll_shutdown(self: std::pin::Pin<&mut Self>, cx: &mut std::task::Context<'_>) -> std::task::Poll<std::io::Result<()>> {
        std::pin::Pin::new(&mut self.get_mut().inner).poll_shutdown(cx)
    }
}