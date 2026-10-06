use crate::anyhow::{anyhow, bail, ensure, Context, Error};
use crate::async_graphql::Result;
use crate::serde::Deserialize;
use crate::serde_json::{self, json, Map};
use crate::tokio_postgres::types::{FromSql, Type};
use crate::tokio_postgres::Row;
use crate::tokio_postgres::{types, Column};
use crate::utils::general::extensions::IteratorV;
use crate::{EntryBlob, EntryRow, JSONValue};
use futures_util::StreamExt;

/*pub fn postgres_row_to_entry_struct<'a, T: for<'de> Deserialize<'de>>(row: Row, table: &str) -> Result<T, Error> {
	let entry_blob = postgres_row_to_entry_blob(row)?;
	let entry_json = entry_blob_to_entry_json(entry_blob, table)?;
	Ok(serde_json::from_value(JSONValue::Object(entry_json.0))?)
}*/
/*pub fn postgres_row_to_json_value(row: Row, columns_to_process: usize) -> Result<JSONValue, Error> {
	let row_data = postgres_row_to_row_data(row, columns_to_process)?;
	Ok(JSONValue::Object(row_data))
}*/

/*pub fn postgres_row_to_entry_blob(row: Row) -> Result<EntryBlob, Error> {
	postgres_row_to_entry_row(row)?.up()
}*/
/// Why use this instead of postgres_row_to_entry_row().up()? Because this one only parses the "data" field. (which is all that's needed for EntryBlob)
pub fn postgres_row_to_entry_blob(row: Row, column_limit: Option<usize>) -> Result<EntryBlob, Error> {
	for (i, column) in row.columns().iter().take(column_limit.unwrap_or(100)).enumerate() {
		let name = column.name();
		if name == "data" {
			//return EntryBlob(pg_cell_to_json_value(&row, column, i)?;
			let cell_json_data = pg_cell_to_json_value(&row, column, i)?;
			return match cell_json_data {
				JSONValue::Object(map) => Ok(EntryBlob(map)),
				_ => Err(anyhow!("DB-entry's \"data\" field is not a json-map.")),
			};
		}
	}
	bail!("Could not find column \"data\" in row.");
}

pub fn postgres_row_to_entry_row(row: Row, column_limit: Option<usize>) -> Result<EntryRow, Error> {
	let mut result: Map<String, JSONValue> = Map::new();
	//for (i, column) in row.columns().iter().take(columns_to_process).enumerate() {
	for (i, column) in row.columns().iter().take(column_limit.unwrap_or(100)).enumerate() {
		let name = column.name();
		/*let value = row.get(name);
		result.insert(name.to_string(), value);*/
		let json_value = pg_cell_to_json_value(&row, column, i)?;
		result.insert(name.to_string(), json_value);
	}
	Ok(EntryRow(result))
}

// keep overall structure in-sync with wal_structs.rs
pub fn pg_cell_to_json_value(row: &Row, column: &Column, column_i: usize) -> Result<JSONValue, Error> {
	let f64_to_json_number = |raw_val: f64| -> Result<JSONValue, Error> {
		let temp = serde_json::Number::from_f64(raw_val.into()).ok_or(anyhow!("invalid json-float"))?;
		Ok(JSONValue::Number(temp))
	};
	Ok(match *column.type_() {
		// for rust-postgres <> postgres type-mappings: https://docs.rs/postgres/latest/postgres/types/trait.FromSql.html#types
		// for postgres types: https://www.postgresql.org/docs/7.4/datatype.html#DATATYPE-TABLE

		// single types
		Type::BOOL => get_basic(row, column, column_i, |a: bool| Ok(JSONValue::Bool(a)))?,
		Type::INT2 => get_basic(row, column, column_i, |a: i16| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
		Type::INT4 => get_basic(row, column, column_i, |a: i32| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
		Type::INT8 => get_basic(row, column, column_i, |a: i64| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
		Type::TEXT | Type::VARCHAR => get_basic(row, column, column_i, |a: String| Ok(JSONValue::String(a)))?,
		Type::JSON | Type::JSONB => get_basic(row, column, column_i, |a: JSONValue| Ok(a))?,
		Type::FLOAT4 => get_basic(row, column, column_i, |a: f32| Ok(f64_to_json_number(a.into())?))?,
		Type::FLOAT8 => get_basic(row, column, column_i, |a: f64| Ok(f64_to_json_number(a)?))?,
		// these types require a custom StringCollector struct as an intermediary
		Type::TS_VECTOR => get_basic(row, column, column_i, |a: StringCollector| Ok(JSONValue::String(a.0)))?,

		// array types
		Type::BOOL_ARRAY => get_array(row, column, column_i, |a: bool| Ok(JSONValue::Bool(a)))?,
		Type::INT2_ARRAY => get_array(row, column, column_i, |a: i16| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
		Type::INT4_ARRAY => get_array(row, column, column_i, |a: i32| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
		Type::INT8_ARRAY => get_array(row, column, column_i, |a: i64| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
		Type::TEXT_ARRAY | Type::VARCHAR_ARRAY => get_array(row, column, column_i, |a: String| Ok(JSONValue::String(a)))?,
		Type::JSON_ARRAY | Type::JSONB_ARRAY => get_array(row, column, column_i, |a: JSONValue| Ok(a))?,
		Type::FLOAT4_ARRAY => get_array(row, column, column_i, |a: f32| Ok(f64_to_json_number(a.into())?))?,
		Type::FLOAT8_ARRAY => get_array(row, column, column_i, |a: f64| Ok(f64_to_json_number(a)?))?,
		// these types require a custom StringCollector struct as an intermediary
		Type::TS_VECTOR_ARRAY => get_array(row, column, column_i, |a: StringCollector| Ok(JSONValue::String(a.0)))?,

		_ => bail!("Cannot convert pg-cell \"{}\" of type \"{}\" to a JSONValue.", column.name(), column.type_().name()),
	})
}

fn get_basic<'a, T: FromSql<'a>>(row: &'a Row, column: &Column, column_i: usize, val_to_json_val: impl Fn(T) -> Result<JSONValue, Error>) -> Result<JSONValue, Error> {
	let raw_val = row.try_get::<_, Option<T>>(column_i).with_context(|| format!("column_name:{}", column.name()))?;
	raw_val.map_or(Ok(JSONValue::Null), val_to_json_val)
}
fn get_array<'a, T: FromSql<'a>>(row: &'a Row, column: &Column, column_i: usize, val_to_json_val: impl Fn(T) -> Result<JSONValue, Error>) -> Result<JSONValue, Error> {
	let raw_val_array = row.try_get::<_, Option<Vec<T>>>(column_i).with_context(|| format!("column_name:{}", column.name()))?;
	Ok(match raw_val_array {
		/*Some(val_array) => {
			let mut result = vec![];
			for val in val_array {
				result.push(val_to_json_val(val)?);
			}
			JSONValue::Array(result)
		},*/
		Some(val_array) => JSONValue::Array(val_array.into_iter().map(|a| val_to_json_val(a)).try_collect2::<Vec<_>>()?),
		None => JSONValue::Null,
	})
}

pub struct StringCollector(pub String);
impl FromSql<'_> for StringCollector {
	fn from_sql(_: &Type, raw: &[u8]) -> Result<StringCollector, Box<dyn std::error::Error + Sync + Send>> {
		/*let result = std::str::from_utf8_lossy(raw);
		Ok(StringCollector(result.to_owned()))*/
		let result = String::from_utf8_lossy(raw);
		Ok(StringCollector(result.to_string()))
	}
	fn accepts(_ty: &Type) -> bool {
		true
	}
}
