use std::{
    cmp::Ordering,
    fmt::{Debug, Display},
};

use bisection_key::{BalancedKey, LexiconKey};
use rust_shared::{
    anyhow::Error,
    async_graphql::{self as async_graphql, InputValueResult, Scalar, ScalarType, Value, InputValueError},
    to_anyhow, utils::general_::extensions::ToOwnedV,
};
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/*pub fn lexicon_key_between(key1: Option<&LexiconKey>, key2: Option<&LexiconKey>) -> Result<LexiconKey, Error> {
    Ok(match (key1, key2) {
        (None, None) => LexiconKey::default(),
        (Some(key1), None) => key1.bisect_end().map_err(to_anyhow)?,
        (None, Some(key2)) => key2.bisect_beginning().map_err(to_anyhow)?,
        (Some(key1), Some(key2)) => key1.bisect(key2).map_err(to_anyhow)?,
    })
}*/

//#[derive(SimpleObject, InputObject)]
pub struct OrderKey {
    pub inner: LexiconKey,
}
impl OrderKey {
    pub fn mid() -> OrderKey {
        OrderKey { inner: LexiconKey::default() }
    }

    pub fn new(str: &str) -> Result<OrderKey, Error> {
        Ok(OrderKey { inner: LexiconKey::new(str).map_err(to_anyhow)? })
    }
    pub fn bisect_start(&self) -> Result<OrderKey, Error> {
        Ok(OrderKey { inner: self.inner.bisect_beginning().map_err(to_anyhow)? })
    }
    pub fn bisect_end(&self) -> Result<OrderKey, Error> {
        Ok(OrderKey { inner: self.inner.bisect_end().map_err(to_anyhow)? })
    }
    pub fn bisect(&self, other: &OrderKey) -> Result<OrderKey, Error> {
        Ok(OrderKey { inner: self.inner.bisect(&other.inner).map_err(to_anyhow)? })
    }
}

// added traits
// ==========

impl Clone for OrderKey {
    fn clone(&self) -> Self {
        OrderKey::new(&self.inner.to_string()).unwrap()
    }
}
impl Serialize for OrderKey {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error> where S: Serializer {
        //serializer.serialize_str(self.inner.to_string().as_str())
        self.inner.to_string().serialize(serializer)
    }
}
impl<'de> Deserialize<'de> for OrderKey {
    fn deserialize<D>(deserializer: D) -> Result<OrderKey, D::Error> where D: Deserializer<'de> {
        let str_val = String::deserialize(deserializer)?;
        Ok(OrderKey {
            inner: LexiconKey::new(&str_val).map_err(serde::de::Error::custom)?,
        })
    }
}

#[Scalar]
impl ScalarType for OrderKey {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::String(s) => Ok(OrderKey::new(&s).map_err(|e| InputValueError::custom(e))?),
            _ => Err(InputValueError::custom("OrderKey must be a string")),
        }
    }
    fn to_value(&self) -> Value {
        Value::String(self.inner.to_string())
    }
}

// pass-through traits
// ==========

impl Eq for OrderKey {}
impl PartialEq for OrderKey {
    fn eq(&self, other: &OrderKey) -> bool { self.inner.eq(&other.inner) }
}
impl Ord for OrderKey {
    fn cmp(&self, other: &OrderKey) -> Ordering { self.inner.cmp(&other.inner) }
}
impl PartialOrd for OrderKey {
    fn partial_cmp(&self, other: &OrderKey) -> Option<Ordering> { self.inner.partial_cmp(&other.inner) }
}
impl Display for OrderKey {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result { std::fmt::Display::fmt(&self.inner, f) }
}
