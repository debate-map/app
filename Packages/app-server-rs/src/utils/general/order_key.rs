use std::{
    cmp::Ordering,
    fmt::{Debug, Display},
};

use lexicon_fractional_index::{key_between, float64_approx};
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
    pub key: String,
}
impl OrderKey {
    pub fn mid() -> OrderKey {
        OrderKey { key: key_between(&None, &None).unwrap() }
    }
    pub fn validate(key: &str) -> Result<(), Error> {
        //float64_approx(key).map_err(to_anyhow)?;
        // the base library's `validate_key` function is private, so pass key to its `key_between` function instead (since it calls `validate_key` internally)
        key_between(&Some(key.o()), &None).map_err(to_anyhow)?;
        Ok(())
    }

    pub fn new(str: &str) -> Result<OrderKey, Error> {
        Self::validate(str)?;
        Ok(OrderKey { key: str.o() })
    }
    pub fn prev(&self) -> Result<OrderKey, Error> {
        Ok(OrderKey { key: key_between(&None, &Some(self.key.o())).map_err(to_anyhow)? })
    }
    pub fn next(&self) -> Result<OrderKey, Error> {
        Ok(OrderKey { key: key_between(&Some(self.key.o()), &None).map_err(to_anyhow)? })
    }
    pub fn between(&self, other: &OrderKey) -> Result<OrderKey, Error> {
        // swap order when self is greater than other (base library enforces this restriction)
        if self.key > other.key {
            return other.between(self);
        }
        Ok(OrderKey { key: key_between(&Some(self.key.o()), &Some(other.key.o())).map_err(to_anyhow)? })
    }
}

// added traits
// ==========

impl Clone for OrderKey {
    fn clone(&self) -> Self {
        OrderKey::new(&self.key.to_string()).unwrap()
    }
}
impl Serialize for OrderKey {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error> where S: Serializer {
        //serializer.serialize_str(self.inner.to_string().as_str())
        self.key.to_string().serialize(serializer)
    }
}
impl<'de> Deserialize<'de> for OrderKey {
    fn deserialize<D>(deserializer: D) -> Result<OrderKey, D::Error> where D: Deserializer<'de> {
        let str_val = String::deserialize(deserializer)?;
        Ok(OrderKey { key: str_val.o() })
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
        Value::String(self.key.to_string())
    }
}

// pass-through traits
// ==========

impl Eq for OrderKey {}
impl PartialEq for OrderKey {
    fn eq(&self, other: &OrderKey) -> bool { self.key.eq(&other.key) }
}
impl Ord for OrderKey {
    fn cmp(&self, other: &OrderKey) -> Ordering { self.key.cmp(&other.key) }
}
impl PartialOrd for OrderKey {
    fn partial_cmp(&self, other: &OrderKey) -> Option<Ordering> { self.key.partial_cmp(&other.key) }
}
impl Display for OrderKey {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result { std::fmt::Display::fmt(&self.key, f) }
}
