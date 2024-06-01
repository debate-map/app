use std::cmp::Ordering;

use rust_shared::{
	anyhow::ensure,
	anyhow::Error,
	itertools::Itertools,
	serde_json::{self, json},
	utils::type_aliases::JSONValue,
};
use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::utils::db::filter::{FilterOp, QueryFilter};

pub fn filter_shape_from_filter(filter: &QueryFilter) -> QueryFilter {
	let mut filter_shape = filter.clone();
	for (field_name, field_filter) in filter_shape.field_filters.clone().iter() {
		let field_filter_mut = filter_shape.field_filters.get_mut(field_name).unwrap();
		field_filter_mut.filter_ops = field_filter
			.filter_ops
			.clone()
			.iter()
			.map(|op| {
				let op_with_vals_stripped = match op {
					FilterOp::EqualsX(_val) => FilterOp::EqualsX(JSONValue::Null),
					FilterOp::IsWithinX(vals) => FilterOp::IsWithinX(vals.iter().map(|_| JSONValue::Null).collect_vec()),
					FilterOp::ContainsAllOfX(vals) => FilterOp::ContainsAllOfX(vals.iter().map(|_| JSONValue::Null).collect_vec()),
					FilterOp::ContainsAnyOfX(vals) => FilterOp::ContainsAnyOfX(vals.iter().map(|_| JSONValue::Null).collect_vec()),
				};
				op_with_vals_stripped
			})
			.collect_vec();
	}
	filter_shape
}

/// A "live query key" is the "signature" of a live-query group or instance.
/// When used for a group, it represents the shape of the filter used in the group's instances. (eg. `{table:"maps",filter:{id:{equalTo:null}}}`)
/// When used for an instance, it represents the specific filter used in the instance. (eg. `{table:"maps",filter:{id:{equalTo:"SOME_MAP_ID_HERE"}}}`)
#[derive(Clone)]
pub struct LQKey {
	pub table_name: String,
	pub filter: QueryFilter,
	// cached json-representation of the key's data (for easy use in hashmaps)
	pub _str: String,
}
impl LQKey {
	pub fn new(table_name: String, filter: QueryFilter) -> LQKey {
		let data = LQKeyData { table_name, filter };
		let _str = serde_json::to_string(&data).unwrap();
		LQKey { table_name: data.table_name, filter: data.filter, _str }
	}
	pub fn new_for_lqi(table_name: String, filter: QueryFilter) -> LQKey {
		Self::new(table_name, filter)
	}
	pub fn new_for_lq_group(table_name: String, filter_or_filter_shape: QueryFilter) -> LQKey {
		let filter_shape = filter_shape_from_filter(&filter_or_filter_shape);
		Self::new(table_name, filter_shape)
	}
	pub fn new_for_lq_group_strict(table_name: String, filter_shape: QueryFilter) -> Result<LQKey, Error> {
		filter_shape.ensure_shape_only()?;
		Ok(Self::new(table_name, filter_shape))
	}

	pub fn as_shape_only(&self) -> LQKey {
		let filter_shape = filter_shape_from_filter(&self.filter);
		LQKey::new(self.table_name.clone(), filter_shape)
	}

	/*pub fn table_name(&self) -> &str { &self.data.table_name }
	pub fn filter(&self) -> &QueryFilter { &self.data.filter }*/
}
impl Serialize for LQKey {
	fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
	where
		S: Serializer,
	{
		LQKeyData { table_name: self.table_name.clone(), filter: self.filter.clone() }.serialize(serializer)
	}
}
impl<'de> Deserialize<'de> for LQKey {
	fn deserialize<D>(deserializer: D) -> Result<LQKey, D::Error>
	where
		D: Deserializer<'de>,
	{
		let data = LQKeyData::deserialize(deserializer)?;
		Ok(LQKey::new(data.table_name, data.filter))
	}
}
// private struct used for making serialization/deserialization easier (through use of derive macros)
#[derive(Clone, Serialize, Deserialize)]
struct LQKeyData {
	table_name: String,
	filter: QueryFilter,
}

// pass-through traits
// ==========

impl std::fmt::Display for LQKey {
	fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
		std::fmt::Display::fmt(&self._str, f)
	}
}
impl std::fmt::Debug for LQKey {
	// Is this good? Or should it return debug-string for LQKeyData struct instead?
	fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
		std::fmt::Debug::fmt(&self._str, f)
	}
}

impl Eq for LQKey {}
impl PartialEq for LQKey {
	fn eq(&self, other: &LQKey) -> bool {
		self._str.eq(&other._str)
	}
}
impl Ord for LQKey {
	fn cmp(&self, other: &LQKey) -> Ordering {
		self._str.cmp(&other._str)
	}
}
impl PartialOrd for LQKey {
	fn partial_cmp(&self, other: &LQKey) -> Option<Ordering> {
		self._str.partial_cmp(&other._str)
	}
}
impl std::hash::Hash for LQKey {
	fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
		self._str.hash(state);
	}
}
