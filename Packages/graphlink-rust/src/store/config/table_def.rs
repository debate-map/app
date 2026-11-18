use crate::{JSONValue, ToOwnedV, RLS};
use anyhow::Error;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub struct TableDef {
	pub name: String,
	pub columns: Vec<ColumnDef>,
	pub rls_policy: RLS,
}
impl TableDef {
	pub fn new2(name: &str, rls_policy: RLS) -> Self {
		Self::new3(name, rls_policy, vec![])
	}
	pub fn new3(name: &str, rls_policy: RLS, mut columns: Vec<ColumnDef>) -> Self {
		// insert a standard "id" column at start of vec (don't worry about setting it as the primary-key; pgsync has that hard-coded to the "id" column for now)
		columns.insert(0, co5("id", "TEXT", false, true, None));
		// insert a standard "data" column at end of vec
		columns.push(co5("data", "JSONB", false, false, None));

		TableDef { name: name.to_string(), rls_policy, columns }
	}
}

#[derive(Debug)]
pub struct ColumnDef {
	pub name: String,
	pub data_type: String,
	pub is_nullable: bool,
	pub pull_from_data: bool,
	pub default_value: Option<String>,
}
impl ToString for ColumnDef {
	fn to_string(&self) -> String {
		let mut out = format!("\"{}\" {}", self.name, self.data_type);
		if !self.is_nullable {
			out += " NOT NULL";
		}
		if self.pull_from_data {
			let generated_as_str = match self.data_type.to_lowercase().as_str() {
				// We need special handling for converting a jsonb string to a postgres TEXT, because the standard postgres conversion includes quotes around the string-contents!
				"text" => format!(" GENERATED ALWAYS AS (data->>'{}') STORED", self.name.as_str()),
				// The rest don't have this issue, because they are not string-types. (so there is no way in which postgres' standard conversion could add quotes around the actual data)
				_ => format!(" GENERATED ALWAYS AS ((data->'{}')::{}) STORED", self.name.as_str(), self.data_type),
			};
			out += &generated_as_str;
		}
		if let Some(default_value) = &self.default_value {
			out += &format!(" DEFAULT {}", default_value);
		}
		out
	}
}

/*pub fn co1(name: &str) -> ColumnDef {
	co2(name, "text".to_string())
}*/
pub fn co2(name: &str, data_type: &str) -> ColumnDef {
	co3(name, data_type, false)
}
pub fn co3(name: &str, data_type: &str, is_nullable: bool) -> ColumnDef {
	co4(name, data_type, is_nullable, true) // default pull_from_data to true, because lib-user's calls to co3 will all want this
}
pub fn co4(name: &str, data_type: &str, is_nullable: bool, pull_from_data: bool) -> ColumnDef {
	co5(name, data_type, is_nullable, pull_from_data, None)
}
pub fn co5(name: &str, data_type: &str, is_nullable: bool, pull_from_data: bool, default_value: Option<String>) -> ColumnDef {
	ColumnDef { name: name.to_string(), data_type: data_type.to_string(), is_nullable, pull_from_data, default_value }
}
