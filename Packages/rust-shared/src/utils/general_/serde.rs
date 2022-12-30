use std::{collections::{HashMap, BTreeMap}, env};
use serde::Serialize;

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