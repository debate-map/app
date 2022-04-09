use anyhow::{anyhow, bail, Context, Error, ensure};
use async_graphql::{Result};
use futures_util::{StreamExt};
use serde_json::{json, Map};
use tokio_postgres::{Column, types};
use tokio_postgres::types::{Type, FromSql};
use tokio_postgres::{Row};
use crate::utils::db::pg_stream_parsing::RowData;
use crate::{utils::{type_aliases::JSONValue}};

pub fn postgres_row_to_json_value(row: Row, columns_to_process: usize) -> Result<JSONValue, Error> {
    let row_data = postgres_row_to_row_data(row, columns_to_process)?;
    Ok(JSONValue::Object(row_data))
}

pub fn postgres_row_to_row_data(row: Row, columns_to_process: usize) -> Result<RowData, Error> {
    let mut result: Map<String, JSONValue> = Map::new();
    for (i, column) in row.columns().iter().take(columns_to_process).enumerate() {
        let name = column.name();
        /*let value = row.get(name);
        result.insert(name.to_string(), value);*/
        let json_value = pg_cell_to_json_value(&row, column, i)?;
        result.insert(name.to_string(), json_value);
    }
    Ok(result)
}

pub fn pg_cell_to_json_value(row: &Row, column: &Column, column_i: usize) -> Result<JSONValue, Error> {
    let f64_to_json_number = |raw_val: f64| -> Result<JSONValue, Error> {
        let temp = serde_json::Number::from_f64(raw_val.into()).ok_or(anyhow!("invalid json-float"))?;
        Ok(JSONValue::Number(temp))
    };
    Ok(match *column.type_() {
        // for rust-postgres <> postgres type-mappings: https://docs.rs/postgres/latest/postgres/types/trait.FromSql.html#types
        // for postgres types: https://www.postgresql.org/docs/7.4/datatype.html#DATATYPE-TABLE

        // basics
        Type::BOOL => get_basic(row, column, column_i, |a: bool| Ok(JSONValue::Bool(a)))?,
        Type::INT2 => get_basic(row, column, column_i, |a: i16| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::INT4 => get_basic(row, column, column_i, |a: i32| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::INT8 => get_basic(row, column, column_i, |a: i64| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::TEXT | Type::VARCHAR => get_basic(row, column, column_i, |a: String| Ok(JSONValue::String(a)))?,
        Type::JSON | Type::JSONB => get_basic(row, column, column_i, |a: JSONValue| Ok(a))?,
        Type::FLOAT4 => get_basic(row, column, column_i, |a: f32| Ok(f64_to_json_number(a.into())?))?,
        Type::FLOAT8 => get_basic(row, column, column_i, |a: f64| Ok(f64_to_json_number(a)?))?,
        // just use stringification for types that don't have a specific pg->rust-postgres FromSQL implementation
        Type::TS_VECTOR => get_basic(row, column, column_i, |a: StringCollector| Ok(JSONValue::String(a.into_str())))?,

        // array types
        Type::BOOL_ARRAY => get_array(row, column, column_i, |a: bool| Ok(JSONValue::Bool(a)))?,
        Type::INT2_ARRAY => get_array(row, column, column_i, |a: i16| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::INT4_ARRAY => get_array(row, column, column_i, |a: i32| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::INT8_ARRAY => get_array(row, column, column_i, |a: i64| Ok(JSONValue::Number(serde_json::Number::from(a))))?,
        Type::TEXT_ARRAY | Type::VARCHAR_ARRAY => get_array(row, column, column_i, |a: String| Ok(JSONValue::String(a)))?,
        Type::JSON_ARRAY | Type::JSONB_ARRAY => get_array(row, column, column_i, |a: JSONValue| Ok(a))?,
        Type::FLOAT4_ARRAY => get_array(row, column, column_i, |a: f32| Ok(f64_to_json_number(a.into())?))?,
        Type::FLOAT8_ARRAY => get_array(row, column, column_i, |a: f64| Ok(f64_to_json_number(a)?))?,
        // just use stringification for types that don't have a specific pg->rust-postgres FromSQL implementation
        Type::TS_VECTOR_ARRAY => get_basic(row, column, column_i, |a: StringCollector| Ok(JSONValue::String(a.into_str())))?,

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
        Some(val_array) => {
            let mut result = vec![];
            for val in val_array {
                result.push(val_to_json_val(val)?);
            }
            JSONValue::Array(result)
        },
        None => JSONValue::Null,
    })
}

enum StringCollector {
    Value(String)
}
impl StringCollector {
    pub fn into_str(self) -> String {
        match self {
            Self::Value(str) => str,
        }
    }
}
impl FromSql<'_> for StringCollector {
    fn from_sql(_: &Type, raw: &[u8]) -> Result<StringCollector, Box<dyn std::error::Error + Sync + Send>> {
        let result = std::str::from_utf8(raw)?;
        Ok(StringCollector::Value(result.to_owned()))
    }

    fn accepts(ty: &Type) -> bool {
        match *ty {
            Type::TS_VECTOR => true,
            _ => false,
        }
    }
}