use std::{collections::{BTreeMap, HashMap}};

use rust_shared::{anyhow::Error, serde, serde_json};
use rust_shared::hyper::Body;
use rust_shared::serde::Serialize;

pub async fn body_to_str(body: Body) -> Result<String, Error> {
    let bytes1 = hyper::body::to_bytes(body).await?;
    let req_as_str: String = String::from_utf8_lossy(&bytes1).as_ref().to_owned();
    Ok(req_as_str)
}

// approach 1 for serializing HashMap with ordered keys (from: https://stackoverflow.com/a/42723390)
pub fn ordered_map<K: Ord + Serialize, V: Serialize, S: serde::Serializer>(value: &HashMap<K, V>, serializer: S) -> Result<S::Ok, S::Error> {
    let ordered: BTreeMap<_, _> = value.iter().collect();
    ordered.serialize(serializer)
}

// approach 2 for serializing HashMap (and such) with ordered keys (from: https://stackoverflow.com/a/42723390)
pub fn sort_alphabetically<T: Serialize, S: serde::Serializer>(value: &T, serializer: S) -> Result<S::Ok, S::Error> {
    let value = serde_json::to_value(value).map_err(serde::ser::Error::custom)?;
    value.serialize(serializer)
}
#[derive(Serialize)] //#[serde(crate = "rust_shared::serde")]
pub struct SortAlphabetically<T: Serialize>(
    #[serde(serialize_with = "sort_alphabetically")]
    T
);