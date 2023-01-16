use std::{collections::{HashMap, BTreeMap}, env};
use anyhow::{anyhow, Error};
use serde::Serialize;
use serde_json::{value::Index, Value, Map};
use std::fmt::Debug;

use crate::utils::type_aliases::JSONValue;

pub fn to_json_value_for_borrowed_obj(value: &impl Serialize) -> Result<serde_json::Value, serde_json::Error> {
    let as_str = serde_json::to_string(value)?;
    let as_json_value: JSONValue = serde_json::from_str(&as_str)?;
    Ok(as_json_value)
}

// json-value extensions
// ==========

pub trait JSONValueV {
    fn try_get<I: Index + Debug>(&self, index: I) -> Result<&Value, Error>;
	fn try_as_bool(&self) -> Result<bool, Error>;
	fn try_as_u64(&self) -> Result<u64, Error>;
	fn try_as_i64(&self) -> Result<i64, Error>;
	fn try_as_f64(&self) -> Result<f64, Error>;
	fn try_as_str(&self) -> Result<&str, Error>;
    fn try_as_array(&self) -> Result<&Vec<Value>, Error>;
	fn try_as_object(&self) -> Result<&Map<String, Value>, Error>;

    // extras
	fn as_string(&self) -> Option<String>;
	fn try_as_string(&self) -> Result<String, Error>;
}
impl JSONValueV for serde_json::Value {
	fn try_get<I: Index + Debug>(&self, index: I) -> Result<&Value, Error> {
        let index_str = format!("{:?}", index);
        self.get(index).ok_or_else(|| anyhow!("Property with key \"{}\" was not found. @json:{}", index_str, self.to_string())) 
    }
	fn try_as_bool(&self) -> Result<bool, Error> { self.as_bool().ok_or_else(|| anyhow!("This json-value was not a bool. @json:{}", self.to_string())) }
	fn try_as_u64(&self) -> Result<u64, Error> { self.as_u64().ok_or_else(|| anyhow!("This json-value was not an u64. @json:{}", self.to_string())) }
	fn try_as_i64(&self) -> Result<i64, Error> { self.as_i64().ok_or_else(|| anyhow!("This json-value was not an i64. @json:{}", self.to_string())) }
	fn try_as_f64(&self) -> Result<f64, Error> { self.as_f64().ok_or_else(|| anyhow!("This json-value was not an f64. @json:{}", self.to_string())) }
	fn try_as_str(&self) -> Result<&str, Error> { self.as_str().ok_or_else(|| anyhow!("This json-value was not a string. @json:{}", self.to_string())) }
	fn try_as_array(&self) -> Result<&Vec<Value>, Error> { self.as_array().ok_or_else(|| anyhow!("This json-value was not an array. @json:{}", self.to_string())) }
	fn try_as_object(&self) -> Result<&Map<String, Value>, Error> { self.as_object().ok_or_else(|| anyhow!("This json-value was not an object. @json:{}", self.to_string())) }

    // extras
	fn as_string(&self) -> Option<String> { self.as_str().map(|a| a.to_owned()) }
	fn try_as_string(&self) -> Result<String, Error> { self.try_as_str().map(|a| a.to_owned()) }
}

// hashmap/indexmap
// ==========

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