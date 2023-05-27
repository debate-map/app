use anyhow::{anyhow, Error, bail};
use hyper::client::HttpConnector;
use hyper::http::HeaderValue;
use hyper::{http, Request, Method, Uri};
use hyper::Client;
use hyper_rustls::HttpsConnector;
use tokio_tungstenite::WebSocketStream;
use hyper::Body;

use crate::utils::k8s::upgrade;

/// Initiates an HTTPS connection to the URI specified within `request`, then immediately upgrades it to a WebSocket connection.
/// This is different from simply connecting to a websocket endpoint, and it's necessary to connect to certain k8s endpoints. (eg. `exec` for pods)
pub async fn upgrade_to_websocket(client: hyper::Client<HttpsConnector<HttpConnector>>, request: hyper::Request<Vec<u8>>) -> Result<WebSocketStream<hyper::upgrade::Upgraded>, Error> {
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

    let req = Request::from_parts(parts, Body::from(body));

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

    upgrade::verify_response(&res, &key)?; //.map_err(Error::UpgradeConnection)?;
    match hyper::upgrade::on(res).await {
        Ok(upgraded) => {
            Ok(WebSocketStream::from_raw_socket(upgraded, tokio_tungstenite::tungstenite::protocol::Role::Client, None).await)
        }

        /*Err(e) => Err(Error::UpgradeConnection(UpgradeConnectionError::GetPendingUpgrade(e))),*/
        Err(e) => bail!("Hit error: {:?}", e)
    }
}