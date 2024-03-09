use std::borrow::Cow;
use std::convert::Infallible;
use std::{collections::{BTreeMap, HashMap}};

use axum::response::ErrorResponse;
use bytes::Bytes;
use futures::FutureExt;
use http_body_util::Full;
use hyper::body::Incoming;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::rt::TokioExecutor;

use crate::{anyhow::{anyhow, bail, Error}, hyper::body::Body, serde, serde_json, to_anyhow};
use crate::serde::Serialize;
use crate::http_body_util::BodyExt;

//pub type HyperClient = rust_shared::hyper_util::client::legacy::Client<HttpConnector, Full<Bytes>>;
//pub type HyperClient = rust_shared::hyper_util::client::legacy::Client<HttpConnector, impl Body>;
//pub type HyperClient<B: Body> = rust_shared::hyper_util::client::legacy::Client<HttpConnector, B>;
pub type HyperClient = crate::hyper_util::client::legacy::Client<HttpConnector, AxumBody>;
pub use crate::hyper_util::client::legacy::Client as HyperClient_; // to access the static functions, use this alias
pub fn new_hyper_client_http() -> HyperClient {
    HyperClient_::builder(TokioExecutor::new()).build_http::<AxumBody>()
}

pub type AxumResult<T, E = ErrorResponse> = axum::response::Result<T, E>;
//pub type AxumResultI<T, E = Infallible> = axum::response::Result<T, E>;
pub type AxumResultE = axum::response::Result<axum::response::Response<AxumBody>, Error>;
pub type AxumResultI = axum::response::Result<axum::response::Response<AxumBody>, Infallible>;
pub type AxumBody = axum::body::Body;

pub async fn body_to_bytes<B: Body>(body: B) -> Result<Bytes, Error> where <B as Body>::Error: std::fmt::Debug {
    let body_collected = match body.collect().await { Ok(a) => a,
        Err(e) => bail!("Error while converting body to bytes: {:?}", e)
    };
    let bytes = body_collected.to_bytes();
    Ok(bytes)
}
pub async fn body_to_str<B: Body>(body: B) -> Result<String, Error> where <B as Body>::Error: std::fmt::Debug {
    let bytes = body_to_bytes(body).await?;
    let str: String = String::from_utf8_lossy(&bytes).as_ref().to_owned();
    Ok(str)
}

pub fn full_body_from_str(into_str_cow: impl Into<Cow<'static, str>>) -> Full<Bytes> {
    let str_cow: Cow<'static, str> = into_str_cow.into();
    let str = str_cow.into_owned();
    let bytes = Bytes::from(str);
    Full::new(bytes)
}

/// This currently doesn't return until the response's data has been completely collected. (ie. this is a blocking operation atm)
pub async fn hyper_response_to_axum_response(hyper_response: crate::hyper::Response<Incoming>) -> axum::http::Response<AxumBody> {
    let (parts, body) = hyper_response.into_parts();

    /*let body_as_stream = body.frame().map(|f| Ok::<Bytes, Infallible>(f.unwrap().unwrap().into_data().unwrap())).into_stream();
    let axum_body = axum::body::Body::from_stream(body_as_stream);*/

    let bytes = body_to_bytes(body).await.unwrap();
    let axum_body = AxumBody::from(bytes);

    let axum_response = axum::http::Response::from_parts(parts, axum_body);
    axum_response
}