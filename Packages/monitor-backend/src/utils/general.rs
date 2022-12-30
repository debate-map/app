use std::{collections::{BTreeMap, HashMap}};

use rust_shared::{anyhow::Error, serde, serde_json};
use rust_shared::hyper::Body;
use rust_shared::serde::Serialize;

pub async fn body_to_str(body: Body) -> Result<String, Error> {
    let bytes1 = rust_shared::hyper::body::to_bytes(body).await?;
    let req_as_str: String = String::from_utf8_lossy(&bytes1).as_ref().to_owned();
    Ok(req_as_str)
}