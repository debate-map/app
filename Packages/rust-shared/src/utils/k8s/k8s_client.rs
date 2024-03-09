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
/*pub async fn upgrade_to_websocket<B: Body + Send + Unpin + std::fmt::Debug + 'static>(client: Client<HttpsConnector<HttpConnector>, B>, request: hyper::Request<B>) -> Result<WebSocketStream<MaybeTlsStream<TcpStream>>, Error>
    where
        <B as Body>::Data: std::marker::Send,
        <B as Body>::Error: Into<std::boxed::Box<(dyn StdError + std::marker::Send + Sync + 'static)>>
{
    let config = WebSocketConfig::from(value)
    let ws_stream = Ok(tokio_tungstenite::connect_async_with_config(request.uri().clone()).await.context("Failed to upgrade to websocket.")?.0);
    return ws_stream;
}*/

/// Initiates an HTTPS connection to the URI specified within `request`, then immediately upgrades it to a WebSocket connection.
/// This is different from simply connecting to a websocket endpoint, and it's necessary to connect to certain k8s endpoints. (eg. `exec` for pods)
pub async fn upgrade_to_websocket<B: Body + Send + Unpin + std::fmt::Debug + 'static>(client: Client<HttpsConnector<HttpConnector>, B>, request: hyper::Request<B>)
    -> Result<WebSocketStream<UpgradedWrapper>, Error>
    //-> Result<WebSocketStream<TokioIo<reqwest::Upgraded>>, Error>
    where
        <B as Body>::Data: std::marker::Send,
        <B as Body>::Error: Into<std::boxed::Box<(dyn StdError + std::marker::Send + Sync + 'static)>>
{
    // add various headers that are required by the websocket-upgrade process: https://stackoverflow.com/a/42334717
    let uri = request.uri().clone();
    let (mut parts, body) = request.into_parts();
    parts.headers.insert(http::header::CONNECTION, HeaderValue::from_static("Upgrade"));
    parts.headers.insert(http::header::UPGRADE, HeaderValue::from_static("websocket"));
    parts.headers.insert(http::header::SEC_WEBSOCKET_VERSION, HeaderValue::from_static("13"));
    let key = upgrade::sec_websocket_key();
    parts.headers.insert(http::header::SEC_WEBSOCKET_KEY, key.parse().expect("valid header value"));
    // Use the binary subprotocol v4, to get JSON `Status` object in `error` channel (3).
    // There's no official documentation about this protocol, but it's described in [`k8s.io/apiserver/pkg/util/wsstream/conn.go`](https://git.io/JLQED).
    // There's a comment about v4 and `Status` object in [`kublet/cri/streaming/remotecommand/httpstream.go`](https://git.io/JLQEh).
    parts.headers.insert(http::header::SEC_WEBSOCKET_PROTOCOL, HeaderValue::from_static(upgrade::WS_PROTOCOL));
    //parts.headers.insert(http::header::HOST, uri.host().unwrap().parse().expect("valid header value")); // commented; link above says it's necessary, but doesn't seem to be (and not sure if this value is correct)

    let req_final = Request::from_parts(parts, body);
    println!("req.Info:{:?}", req_final);
    println!("req.Info2:{:#?}", req_final);

    //let res = client.get(parts.uri.to_string()).headers(parts.headers).body(body).send().await?;
    //let res = client.get(Request::from_parts(parts, Body::from(body)));
    let res = client.request(req_final).await.context("Failed in client.request.")?;
    println!("res.Info:{:?}", res);
    println!("res.Info2:{:#?}", res);

    //let res_body_read = Full::from(res.into_body());
    /*let (res_parts, body) = res.into_parts();
    let bytes = body.collect().await.context("Failed to collect body.")?.to_bytes();
    let res_body_read = Full::from(bytes);
    let res_read = hyper::Response::from_parts(res_parts, res_body_read);*/

    upgrade::verify_response(&res, &key).context("Failed to verify response.")?; //.map_err(Error::UpgradeConnection)?;
    match hyper::upgrade::on(res).await {
        Ok(upgraded) => {
            let upgraded_wrapped = UpgradedWrapper::new(upgraded);
            Ok(WebSocketStream::from_raw_socket(upgraded_wrapped, tokio_tungstenite::tungstenite::protocol::Role::Client, None).await)
            //Ok(WebSocketStream::from_raw_socket(upgraded, tokio_tungstenite::tungstenite::protocol::Role::Client, None).await)
            //Ok(tokio_tungstenite::client_async(upgraded.into(), None).await.context("Failed to upgrade to websocket.")?.0)

            /*let upgraded_wrapped = hyper_util::rt::TokioIo::new(upgraded);
            Ok(WebSocketStream::from_raw_socket(upgraded_wrapped, tokio_tungstenite::tungstenite::protocol::Role::Client, None).await)*/
        }

        /*Err(e) => Err(Error::UpgradeConnection(UpgradeConnectionError::GetPendingUpgrade(e))),*/
        Err(e) => bail!("Hit error: {:?}", e)
    }
}

/// Initiates an HTTPS connection to the URI specified within `request`, then immediately upgrades it to a WebSocket connection.
/// This is different from simply connecting to a websocket endpoint, and it's necessary to connect to certain k8s endpoints. (eg. `exec` for pods)
pub async fn upgrade_to_websocket_reqwest(client: reqwest::Client, mut request: reqwest::Request)
    -> Result<WebSocketStream<UpgradedWrapperReqwest>, Error>
    //-> Result<WebSocketStream<TokioIo<reqwest::Upgraded>>, Error>
{
    // add various headers that are required by the websocket-upgrade process: https://stackoverflow.com/a/42334717
    let url = request.url().clone();
    let headers = request.headers_mut();
    headers.insert(http::header::CONNECTION, HeaderValue::from_static("Upgrade"));
    headers.insert(http::header::UPGRADE, HeaderValue::from_static("websocket"));
    headers.insert(http::header::SEC_WEBSOCKET_VERSION, HeaderValue::from_static("13"));
    let key = upgrade::sec_websocket_key();
    headers.insert(http::header::SEC_WEBSOCKET_KEY, key.parse().expect("valid header value"));
    // Use the binary subprotocol v4, to get JSON `Status` object in `error` channel (3).
    // There's no official documentation about this protocol, but it's described in [`k8s.io/apiserver/pkg/util/wsstream/conn.go`](https://git.io/JLQED).
    // There's a comment about v4 and `Status` object in [`kublet/cri/streaming/remotecommand/httpstream.go`](https://git.io/JLQEh).
    headers.insert(http::header::SEC_WEBSOCKET_PROTOCOL, HeaderValue::from_static(upgrade::WS_PROTOCOL));
    //headers.insert(http::header::HOST, uri.host().unwrap().parse().expect("valid header value")); // commented; link above says it's necessary, but doesn't seem to be (and not sure if this value is correct)

    let req_final = reqwest::RequestBuilder::from_parts(client.clone(), request)
        .version(Version::HTTP_11) // to match with hyper (maybe also needed for upgrade process?)
        .build().context("Failed to build request.")?;
    //let req_final = request;
    println!("req.Info:{:?}", req_final);
    println!("req.Info2:{:#?}", req_final);

    let res = client.execute(req_final).await.context("Failed in client.request.")?;
    println!("res.Info:{:?}", res);
    println!("res.Info2:{:#?}", res);

    //let res_body_read = Full::from(res.into_body());
    /*let bytes = res.bytes().await.context("Failed to collect body.")?;
    let res_body_read = Full::from(bytes);
    //let res_read = reqwest::Response::from_parts(res_parts, res_body_read);*/

    upgrade::verify_response_reqwest(&res, &key).context("Failed to verify response.")?; //.map_err(Error::UpgradeConnection)?;
    match res.upgrade().await {
        Ok(upgraded) => {
            let upgraded_wrapped = UpgradedWrapperReqwest::new(upgraded);
            Ok(WebSocketStream::from_raw_socket(upgraded_wrapped, tokio_tungstenite::tungstenite::protocol::Role::Client, None).await)
            /*let upgraded_wrapped = hyper_util::rt::TokioIo::new(upgraded);
            Ok(WebSocketStream::from_raw_socket(upgraded_wrapped, tokio_tungstenite::tungstenite::protocol::Role::Client, None).await)*/
        }

        /*Err(e) => Err(Error::UpgradeConnection(UpgradeConnectionError::GetPendingUpgrade(e))),*/
        Err(e) => bail!("Hit error: {:?}", e)
    }
}

pin_project! {
    /// Wrapper struct that holds the Upgraded from hyper, and makes it implement the AsyncRead and AsyncWrite traits.
    /// This is necessary because the Upgraded struct from hyper (v1+) does not implement these traits.
    /// Based on: https://github.com/0xE282B0/hyper/commit/ef62ce9b3cbe2125247d9609750db755ce90a72c#diff-6980a30101198fa094dbf720d2d64038a8afd34d1c9eaa533944d6190578e099R170
    pub struct UpgradedWrapper {
        #[pin]
        inner: hyper::upgrade::Upgraded,
    }
}
impl UpgradedWrapper {
    fn new(inner: hyper::upgrade::Upgraded) -> Self {
        Self { inner }
    }
}
impl tokio::io::AsyncRead for UpgradedWrapper {
    /*fn poll_read(self: std::pin::Pin<&mut Self>, cx: &mut std::task::Context<'_>, buf: &mut tokio::io::ReadBuf) -> std::task::Poll<std::io::Result<()>> {
        let mut buf2_ref = buf.inner_mut();
        let mut buf3: hyper::rt::ReadBuf = ReadBuf::uninit(&mut buf2_ref);
        let cursor = ReadBuf::unfilled(&mut buf3);
        std::pin::Pin::new(&mut self.get_mut().inner).poll_read(cx, cursor)
    }*/
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut std::task::Context<'_>, 
        tbuf: &mut tokio::io::ReadBuf<'_>,
    ) -> Poll<Result<(), std::io::Error>> {
        //let init = tbuf.initialized().len();
        let filled = tbuf.filled().len();
        let sub_filled = unsafe {
            let mut buf = hyper::rt::ReadBuf::uninit(tbuf.unfilled_mut());

            match hyper::rt::Read::poll_read(self.project().inner, cx, buf.unfilled()) {
                Poll::Ready(Ok(())) => buf.filled().len(),
                other => return other,
            }
        };

        let n_filled = filled + sub_filled;
        // At least sub_filled bytes had to have been initialized.
        let n_init = sub_filled;
        unsafe {
            tbuf.assume_init(n_init);
            tbuf.set_filled(n_filled);
        }

        Poll::Ready(Ok(()))
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

// create wrapper struct that hold the Upgraded from reqwest, and makes it implement the AsyncRead and AsyncWrite traits
// this is necessary because the Upgraded struct from reqwest does not implement these traits
pub struct UpgradedWrapperReqwest {
    inner: reqwest::Upgraded
}
impl UpgradedWrapperReqwest {
    fn new(inner: reqwest::Upgraded) -> Self {
        Self { inner }
    }
}
impl tokio::io::AsyncRead for UpgradedWrapperReqwest {
    fn poll_read(self: std::pin::Pin<&mut Self>, cx: &mut std::task::Context<'_>, buf: &mut tokio::io::ReadBuf) -> std::task::Poll<std::io::Result<()>> {
        std::pin::Pin::new(&mut self.get_mut().inner).poll_read(cx, buf)
    }
}
impl tokio::io::AsyncWrite for UpgradedWrapperReqwest {
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