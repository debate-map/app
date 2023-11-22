use rust_shared::anyhow::{anyhow, bail, Context, Error, ensure};
use rust_shared::bytes::Bytes;
use rust_shared::itertools::Itertools;
use rust_shared::postgres_protocol::message::backend::{Column, Tuple};
use rust_shared::serde_json::{Map, self};
use rust_shared::to_anyhow;
use rust_shared::tokio_postgres::types::{Type, FromSql};
use rust_shared::utils::general_::extensions::{IteratorV, ToOwnedV};
use rust_shared::utils::type_aliases::{RowData, JSONValue};
use serde::Deserialize;

use crate::utils::db::pg_row_to_json::{pg_cell_to_json_value, StringCollector};
use crate::utils::db::pg_stream_parsing::parse_postgres_array_as_strings;

/// Table info, as collected from "Relation" messages, received from the `pgoutput` plugin. For example contents of `pgoutput` messages, see `@FormatExamples/PGOutput_Messages.md`. 
pub struct TableInfo {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
}
pub struct ColumnInfo {
    pub name: String,
    pub data_type: Type,
}
impl ColumnInfo {
    pub fn from_column(col: &Column) -> Self {
        Self {
            name: col.name().unwrap().to_owned(),
            data_type: Type::from_oid(col.type_id() as u32).unwrap(),
        }
    }
}

pub fn wal_data_tuple_to_struct<'a, T: for<'de> Deserialize<'de>>(data_tuple: &Tuple, table_info: &TableInfo) -> Result<T, Error> {
    let as_json = wal_data_tuple_to_json_value(data_tuple, table_info, 100)?;
    Ok(serde_json::from_value(as_json)?)
}
pub fn wal_data_tuple_to_json_value(data_tuple: &Tuple, table_info: &TableInfo, columns_to_process: usize) -> Result<JSONValue, Error> {
    let row_data = wal_data_tuple_to_row_data(data_tuple, table_info, columns_to_process)?;
    Ok(JSONValue::Object(row_data))
}
pub fn wal_data_tuple_to_row_data(data_tuple: &Tuple, table_info: &TableInfo, columns_to_process: usize) -> Result<RowData, Error> {
    let mut result: Map<String, JSONValue> = Map::new();
    for (i, column) in table_info.columns.iter().take(columns_to_process).enumerate() {
        let json_value = data_tuple_entry_to_json_value(data_tuple, column, i)?;
        result.insert(column.name.to_owned(), json_value);
    }
    Ok(result)
}

// keep overall structure in-sync with pg_row_to_json.rs
pub fn data_tuple_entry_to_json_value(data_tuple: &Tuple, column: &ColumnInfo, column_i: usize) -> Result<JSONValue, Error> {
    let f64_to_json_number = |raw_val: f64| -> Result<JSONValue, Error> {
        let temp = serde_json::Number::from_f64(raw_val.into()).ok_or(anyhow!("invalid json-float"))?;
        Ok(JSONValue::Number(temp))
    };
    Ok(match column.data_type {
        // for rust-postgres <> postgres type-mappings: https://docs.rs/postgres/latest/postgres/types/trait.FromSql.html#types
        // for postgres types: https://www.postgresql.org/docs/7.4/datatype.html#DATATYPE-TABLE

        // single types
        Type::BOOL => get_basic(data_tuple, column, column_i, |a: bool| Ok(JSONValue::Bool(a)))?,
        Type::INT2 => get_basic(data_tuple, column, column_i, |a: i16| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::INT4 => get_basic(data_tuple, column, column_i, |a: i32| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::INT8 => get_basic(data_tuple, column, column_i, |a: i64| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::TEXT | Type::VARCHAR => get_basic(data_tuple, column, column_i, |a: String| Ok(JSONValue::String(a)))?,
        Type::JSON | Type::JSONB => get_basic(data_tuple, column, column_i, |a: JSONValue| Ok(a))?,
        Type::FLOAT4 => get_basic(data_tuple, column, column_i, |a: f32| Ok(f64_to_json_number(a.into())?))?,
        Type::FLOAT8 => get_basic(data_tuple, column, column_i, |a: f64| Ok(f64_to_json_number(a)?))?,
        // these types require a custom StringCollector struct as an intermediary
        //Type::TS_VECTOR => get_basic(data_tuple, column, column_i, |a: StringCollector| Ok(JSONValue::String(a.0)))?,
        Type::TS_VECTOR => JSONValue::String("n/a".o()), // todo: implement actual handling here

        // array types
        Type::BOOL_ARRAY => get_array(data_tuple, column, column_i, |a: bool| Ok(JSONValue::Bool(a)))?,
        Type::INT2_ARRAY => get_array(data_tuple, column, column_i, |a: i16| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::INT4_ARRAY => get_array(data_tuple, column, column_i, |a: i32| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::INT8_ARRAY => get_array(data_tuple, column, column_i, |a: i64| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::TEXT_ARRAY | Type::VARCHAR_ARRAY => get_array(data_tuple, column, column_i, |a: String| Ok(JSONValue::String(a)))?,
        Type::JSON_ARRAY | Type::JSONB_ARRAY => get_array(data_tuple, column, column_i, |a: JSONValue| Ok(a))?,
        Type::FLOAT4_ARRAY => get_array(data_tuple, column, column_i, |a: f32| Ok(f64_to_json_number(a.into())?))?,
        Type::FLOAT8_ARRAY => get_array(data_tuple, column, column_i, |a: f64| Ok(f64_to_json_number(a)?))?,
        // these types require a custom StringCollector struct as an intermediary
        //Type::TS_VECTOR_ARRAY => get_array(data_tuple, column, column_i, |a: StringCollector| Ok(JSONValue::String(a.0)))?,
        Type::TS_VECTOR_ARRAY => JSONValue::Array(vec![]), // todo: implement actual handling here

        _ => bail!("Cannot convert pg-cell \"{}\" of type \"{}\" to a JSONValue.", column.name, column.data_type.name()),
    })
}

fn get_basic<'a, T: for<'de> Deserialize<'de>>(data_tuple: &'a Tuple, column: &ColumnInfo, column_i: usize, val_to_json_val: impl Fn(T) -> Result<JSONValue, Error>) -> Result<JSONValue, Error> {
    let cell_data = data_tuple.tuple_data().get(column_i).ok_or(anyhow!("No data in tuple for column-index {column_i}."))?;
    use rust_shared::postgres_protocol::message::backend::TupleData::*;
    match cell_data {
        Null => Ok(JSONValue::Null),
        UnchangedToast => Ok(JSONValue::Null),
        Text(val_as_bytes) => {
            lds_text_to_json_value_using_pg_data_type(val_as_bytes, column.data_type.clone(), val_to_json_val)
        },
    }
}
fn get_array<'a, T: for<'de> Deserialize<'de>>(data_tuple: &'a Tuple, column: &ColumnInfo, column_i: usize, val_to_json_val: impl Fn(T) -> Result<JSONValue, Error>) -> Result<JSONValue, Error> {
    let cell_data = data_tuple.tuple_data().get(column_i).ok_or(anyhow!("No data in tuple for column-index {column_i}."))?;
    use rust_shared::postgres_protocol::message::backend::TupleData::*;
    match cell_data {
        Null => Ok(JSONValue::Null),
        UnchangedToast => Ok(JSONValue::Null),
        Text(val_as_bytes) => {
            let val_as_u8_slice = val_as_bytes.as_ref();

            // we cannot use the FromSql implementations from rust-postgres, because the logical-replication streams use textual formats rather than binary formats (FromSql expects binary)
            //let val_as_vec_of_type: Vec<T> = Vec::<T>::from_sql(&column.data_type, val_as_u8_slice).map_err(to_anyhow)?;

            let val_as_string = String::from_utf8_lossy(val_as_u8_slice).to_string();
            let val_as_vec_of_string: Vec<String> = parse_postgres_array_as_strings(&val_as_string);
            let val_as_vec_of_json_val = val_as_vec_of_string.into_iter().map(|item_as_str| {
                let item_type = pg_array_type_to_basic_type(&column.data_type).ok_or(anyhow!("Column's data-type was not an array, despite func-caller thinking it was! @dataType:{}", column.data_type.name()))?;
                let item_as_bytes = Bytes::copy_from_slice(item_as_str.as_bytes());
                lds_text_to_json_value_using_pg_data_type(&item_as_bytes, item_type, |val| val_to_json_val(val))
            }).try_collect2::<Vec<_>>()?;
            Ok(JSONValue::Array(val_as_vec_of_json_val))
        },
    }
}

fn pg_array_type_to_basic_type(array_type: &Type) -> Option<Type> {
    match *array_type {
        Type::BOOL_ARRAY => Some(Type::BOOL),
        Type::INT2_ARRAY => Some(Type::INT2),
        Type::INT4_ARRAY => Some(Type::INT4),
        Type::INT8_ARRAY => Some(Type::INT8),
        Type::TEXT_ARRAY => Some(Type::TEXT),
        Type::VARCHAR_ARRAY => Some(Type::VARCHAR),
        Type::JSON_ARRAY => Some(Type::JSON),
        Type::JSONB_ARRAY => Some(Type::JSONB),
        Type::FLOAT4_ARRAY => Some(Type::FLOAT4),
        Type::FLOAT8_ARRAY => Some(Type::FLOAT8),
        //Type::TS_VECTOR_ARRAY => Some(Type::TS_VECTOR), // not needed atm, since tsvector columns are currently ignored by data_tuple_entry_to_json_value
        _ => None,
    }
}
fn lds_text_to_json_value_using_pg_data_type<'a, T: for<'de> Deserialize<'de>>(val_as_bytes: &Bytes, data_type: Type, val_to_json_val: impl Fn(T) -> Result<JSONValue, Error>) -> Result<JSONValue, Error> {
    let val_as_bytes_final = if data_type == Type::TEXT || data_type == Type::VARCHAR {
        // add quote chars at start and end
        let mut temp2 = Vec::with_capacity(val_as_bytes.len() + 2);
        temp2.push(b'"');
        temp2.extend_from_slice(val_as_bytes);
        temp2.push(b'"');
        Bytes::from(temp2)
    } else {
        val_as_bytes.clone()
    };
    let val_as_u8_slice = val_as_bytes_final.as_ref();
    if val_as_u8_slice.len() == 0 || val_as_u8_slice == b"null" {
        return Ok(JSONValue::Null);
    }

    if data_type == Type::BOOL {
        if val_as_u8_slice == b"t" {
            return Ok(JSONValue::Bool(true));
        } else if val_as_u8_slice == b"f" {
            return Ok(JSONValue::Bool(false));
        }
        bail!("Invalid text-value for boolean-column (should be `t` or `f`): {}", String::from_utf8_lossy(val_as_u8_slice).to_string());
    }

    // we cannot use the FromSql implementations from rust-postgres, because the logical-replication streams use textual formats rather than binary formats (FromSql expects binary)
    /*let val_as_type: T = T::from_sql(&column.data_type, val_as_u8_slice).map_err(to_anyhow).with_context(|| {
        format!("@type:{} @val_as_text:{}", column.data_type.name(), String::from_utf8_lossy(val_as_u8_slice).to_string())
    })?;*/

    let val_as_type: T = serde_json::from_slice(val_as_u8_slice).map_err(to_anyhow).with_context(|| {
        format!("@type:{} @val_as_text:{}", data_type.name(), String::from_utf8_lossy(val_as_u8_slice).to_string())
    })?;

    let val_as_json_val = val_to_json_val(val_as_type);
    val_as_json_val
}