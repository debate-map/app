// the crate's row conversions, plus debate-map's old helper names on top (same results: every column, by name)
pub use graphlink_rust::db::conversions::pg_row_to_json::*;
use rust_shared::anyhow::Error;
use rust_shared::serde::Deserialize;
use rust_shared::serde_json;
use rust_shared::tokio_postgres::Row;
use rust_shared::utils::type_aliases::{JSONValue, RowData};

pub fn postgres_row_to_struct<'a, T: for<'de> Deserialize<'de>>(row: Row) -> Result<T, Error> {
	let as_json = postgres_row_to_json_value(row, 100)?;
	Ok(serde_json::from_value(as_json)?)
}
pub fn postgres_row_to_json_value(row: Row, columns_to_process: usize) -> Result<JSONValue, Error> {
	let row_data = postgres_row_to_row_data(row, columns_to_process)?;
	Ok(JSONValue::Object(row_data))
}
pub fn postgres_row_to_row_data(row: Row, columns_to_process: usize) -> Result<RowData, Error> {
	Ok(postgres_row_to_entry_row(row, Some(columns_to_process))?.0) // the crate's version of the same column-by-column loop
}
