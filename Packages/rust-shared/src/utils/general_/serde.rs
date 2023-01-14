use std::{collections::{HashMap, BTreeMap}, env};
use serde::Serialize;

use crate::utils::type_aliases::JSONValue;

pub fn to_json_value_for_borrowed_obj(value: &impl Serialize) -> Result<serde_json::Value, serde_json::Error> {
    let as_str = serde_json::to_string(value)?;
    let as_json_value: JSONValue = serde_json::from_str(&as_str)?;
    Ok(as_json_value)
}

/// approach 1 for serializing HashMap with consistently-ordered (alphabetically) keys (from: https://stackoverflow.com/a/42723390)
pub fn ordered_map<K: Ord + Serialize, V: Serialize, S: serde::Serializer>(value: &HashMap<K, V>, serializer: S) -> Result<S::Ok, S::Error> {
    let ordered: BTreeMap<_, _> = value.iter().collect();
    ordered.serialize(serializer)
}

/// approach 2 for serializing HashMap (and such) with consistently-ordered (alphabetically) keys (from: https://stackoverflow.com/a/42723390)
#[derive(Serialize)] //#[serde(crate = "rust_shared::serde")]
pub struct SortAlphabetically<T: Serialize>(
    #[serde(serialize_with = "sort_alphabetically")]
    T
);
pub fn sort_alphabetically<T: Serialize, S: serde::Serializer>(value: &T, serializer: S) -> Result<S::Ok, S::Error> {
    let value = serde_json::to_value(value).map_err(serde::ser::Error::custom)?;
    value.serialize(serializer)
}

// approach 3 for serializing IndexMap, with insertion-order preserved
// [see IndexMapAGQL in gql_utils.rs]