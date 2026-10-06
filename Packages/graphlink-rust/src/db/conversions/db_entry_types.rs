use core::ops::{Deref, DerefMut};
use std::sync::Arc;

use anyhow::{anyhow, Context, Error};
use deadpool::managed::Object;
use deadpool_postgres::Manager;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Map;

use crate::{cf, JSONMap, JSONValue, TableDef, ToOwnedV, RLS};

/// There are four "shapes" for a given db-entry:
/// 1) EntryRow [this struct]: The root serde_json::Map<String, JSONValue>, constructed from converting each postgres cell/value into its json-value equivalent. (data can come from a query, or a logical-replication change event)
/// 2) EntryBlob: The serde_json::Map<String, JSONValue> for the "data" cell of a given db-entry. (contains all data for the row; the rest are "generated always as X", where X is just a path into the "data" jsonb)
/// 3) EntryJSON: Same as #2, except reshaped to fit the shape of the associated Rust struct. (ie. rust-known fields are in the root, whereas rust-unknown fields are put into an "extras" sub-map)
/// 4) EntryStruct: The Rust struct, obtained by deserializing #3.
pub struct EntryRow(pub Map<String, JSONValue>);
impl EntryRow {
	pub fn up(mut self) -> Result<EntryBlob, Error> {
		match self.0.remove("data") {
			Some(JSONValue::Object(map)) => Ok(EntryBlob(map)),
			None => Err(anyhow!("Entry-row's \"data\" field is missing.")),
			_ => Err(anyhow::anyhow!("Entry-row's \"data\" field is not a map.")),
		}
	}
}

/// There are four "shapes" for a given db-entry:
/// 1) EntryRow: The root serde_json::Map<String, JSONValue>, constructed from converting each postgres cell/value into its json-value equivalent. (data can come from a query, or a logical-replication change event)
/// 2) EntryBlob [this struct]: The serde_json::Map<String, JSONValue> for the "data" cell of a given db-entry. (contains all data for the row; the rest are "generated always as X", where X is just a path into the "data" jsonb)
/// 3) EntryJSON: Same as #2, except reshaped to fit the shape of the associated Rust struct. (ie. rust-known fields are in the root, whereas rust-unknown fields are put into an "extras" sub-map)
/// 4) EntryStruct: The Rust struct, obtained by deserializing #3.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryBlob(pub Map<String, JSONValue>);
impl EntryBlob {
	//pub fn down(self) -> Result<EntryRow, Error> {}

	/// Expands a db-entry from a json map (ie. the "data" cell in the actual table row), to a shape that matches the Rust structs. (and thus the graphql api as well)
	/// Procedure: It takes the "data" map, then moves any properties matching columns defined for the table out into a (new) root map, and puts the rest in an "extras" sub-map.
	pub fn up(mut self, table_name: &str) -> Result<EntryJSON, Error> {
		let mut entry_json: EntryJSON = EntryJSON(JSONMap::new());

		let generic_table = TableDef { name: "GENERIC_TEMP".o(), rls_policy: RLS::UserMatchesX("n/a".o()), columns: vec![] };
		let table_def = match table_name {
			"GENERIC_TEMP" => &generic_table,
			_ => cf().table_defs.iter().find(|a| a.name == table_name).ok_or(anyhow!("Table not found: {}", table_name))?,
		};
		for root_field in &table_def.columns {
			if root_field.name == "data" {
				continue;
			}
			if let Some(val) = self.remove(&root_field.name) {
				entry_json.insert(root_field.name.o(), val);
			}
		}
		entry_json.insert("extras".o(), JSONValue::Object(self.0));
		Ok(entry_json)
	}
}

impl Deref for EntryBlob {
	type Target = Map<String, JSONValue>;
	fn deref(&self) -> &Self::Target {
		&self.0
	}
}
impl DerefMut for EntryBlob {
	fn deref_mut(&mut self) -> &mut Self::Target {
		&mut self.0
	}
}

/// There are four "shapes" for a given db-entry:
/// 1) EntryRow: The root serde_json::Map<String, JSONValue>, constructed from converting each postgres cell/value into its json-value equivalent. (data can come from a query, or a logical-replication change event)
/// 2) EntryBlob: The serde_json::Map<String, JSONValue> for the "data" cell of a given db-entry. (contains all data for the row; the rest are "generated always as X", where X is just a path into the "data" jsonb)
/// 3) EntryJSON [this struct]: Same as #2, except reshaped to fit the shape of the associated Rust struct. (ie. rust-known fields are in the root, whereas rust-unknown fields are put into an "extras" sub-map)
/// 4) EntryStruct: The Rust struct, obtained by deserializing #3.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryJSON(pub Map<String, JSONValue>);
impl EntryJSON {
	/// Collapses a db-entry into a json map. (which is expected to soon be stored as the "data" cell in the actual table row)
	/// Procedure: It takes the "extras" map as the base for the return-value map, then writes all direct fields (in the root row_flat map) as properties within that map. (overwriting any keys with the same name)
	/// Note: This returns Map<String, JSONValue> rather than EntryBlob, because it returns only the "data" cell, ie. it does NOT wrap that map into a new root map with a "data" sub-map.
	pub fn down(mut self) -> Result<EntryBlob, Error> {
		//let data: Map<String, JSONValue> = row.into_iter().map(|(key, val)| (key, val)).collect();
		// variant using .take()
		//let data: Map<String, JSONValue> = row.get("data")?.take::<JSONValue::Object>().;
		//let data: Map<String, JSONValue> = match row.get_mut("data").ok_or(anyhow!(r#"No "id" field in db-entry!"#))?.take() {
		let mut entry_blob: Map<String, JSONValue> = match self.remove("extras") {
			Some(JSONValue::Object(map)) => map,
			None => return Err(anyhow!("Entry-json's \"extras\" field is missing.")),
			_ => return Err(anyhow!("Entry-json's \"extras\" field is not a json-map.")),
		};
		for (key, val) in self.0 {
			entry_blob.insert(key, val);
		}
		Ok(EntryBlob(entry_blob))
	}

	pub fn up<T: DeserializeOwned>(self) -> Result<T, Error> {
		let entry_struct: T = match 1 {
			#[cfg(debug_assertions)]
			_ => serde_json::from_value(JSONValue::Object(self.0.clone())).with_context(|| format!("Failed to deserialize entry-json into struct. @structName:{} @entryJSON:{:?}", std::any::type_name::<T>(), self.0))?,
			#[cfg(not(debug_assertions))]
			_ => serde_json::from_value(JSONValue::Object(self.0))?,
		};
		Ok(entry_struct)
	}

	pub fn from_struct<T: Serialize>(entry_struct: T) -> Result<EntryJSON, Error> {
		let entry_json: EntryJSON = match serde_json::to_value(entry_struct) {
			Ok(JSONValue::Object(map)) => EntryJSON(map),
			_ => return Err(anyhow!("Entry-struct did not serialize to a json-map!")),
		};
		Ok(entry_json)
	}
}

impl Deref for EntryJSON {
	type Target = Map<String, JSONValue>;
	fn deref(&self) -> &Self::Target {
		&self.0
	}
}
impl DerefMut for EntryJSON {
	fn deref_mut(&mut self) -> &mut Self::Target {
		&mut self.0
	}
}
