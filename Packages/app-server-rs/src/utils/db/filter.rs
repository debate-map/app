use std::fmt::Display;
use anyhow::{anyhow, bail, Context, Error};
use crate::utils::general::extensions::IteratorV;
use itertools::{chain, Itertools};
use serde_json::Map;
use tokio_postgres::types::ToSql;
use crate::{store::live_queries::RowData, utils::type_aliases::JSONValue};
use super::fragments::{SQLFragment, SQLParam};

pub type Filter = Option<JSONValue>; // we use JSONValue, because it has the InputType trait (unlike Map<...>, for some reason)
//pub type Filter = Option<Map<String, JSONValue>>;

pub fn get_sql_for_filters(filter: &Filter) -> Result<SQLFragment, Error> {
    let filter = match filter.as_ref() {
        Some(a) => a,
        None => return Ok(SQLFragment::lit("")),
    };

    let mut parts: Vec<SQLFragment> = vec![];
    parts.push(SQLFragment::lit("("));
    for (i, (field_name, field_filters)) in filter.as_object().ok_or_else(|| anyhow!("Filter root-structure was not an object!"))?.iter().enumerate() {
        if i > 0 {
            parts.push(SQLFragment::lit(") AND ("));
        }
        //if let Some((filter_type, filter_value)) = field_filters.as_object().unwrap().iter().next() {
        for (filter_type, filter_value) in field_filters.as_object().ok_or_else(|| anyhow!("Filter-structure for field {field_name} was not an object!"))? {
            parts.push(match filter_type.as_str() {
                "equalTo" => SQLFragment::new("$I = $V", vec![
                    SQLParam::Ident(field_name.clone()),
                    filter_value_to_value_param(filter_value)?,
                ]),
                "in" => {
                    let vals = filter_value.as_array().ok_or_else(|| anyhow!("Value for \"in\" filter was not an array!"))?;
                    SQLFragment::INTERPOLATED_SQL(
                        format!("$I IN ({})", vals.iter().map(|_| "$V").collect_vec().join(",")),
                        chain(
                            [SQLParam::Ident(field_name.clone())],
                            vals.iter().map(|a| filter_value_to_value_param(a)).try_collect2::<Vec<SQLParam>>()?,
                        ).collect_vec()
                    )
                },
                // see: https://stackoverflow.com/a/54069718
                //"contains" => SQLFragment::new("ANY(\"$X\") = $X", vec![field_name, &filter_value.to_string().replace("\"", "'")]),
                "contains" => {
                    /*let vals = filter_value.as_array().ok_or_else(|| anyhow!("Value for \"contains\" filter was not an array!"))?;
                    SQLFragment::INTERPOLATED_SQL(
                        format!("$I @> '{{{}}}'", vals.iter().map(|_| "$V").collect_vec().join(",")),
                        chain(
                            [SQLParam::Ident(field_name.clone())],
                            vals.iter().map(|a| filter_value_to_value_param(a)).try_collect2::<Vec<SQLParam>>()?,
                        ).collect_vec()
                    )*/
                    
                    //let _val_str = filter_value.as_str().ok_or_else(|| anyhow!("Value for \"contains\" filter was not a string!"))?;

                    // meaning: if the row contains any values in the passed array (read as: if any of the row's values match the passed value) 
                    //SQLFragment::new("$I @> '{$V}'", vec![
                        
                    // meaining: if the row contains all values in the passed jsonb array (this only works for json presumably)
                    //SQLFragment::new("$I @> cast($V as jsonb)", vec![

                    // meaining: if the row contains all values in the passed array (see: https://stackoverflow.com/a/54069718)
                    //SQLFragment::new("$I @> '{$V}'", vec![ // this syntax works in console, but not in prepared statements apparently
                    SQLFragment::new("$I @> array[$V]", vec![
                        SQLParam::Ident(field_name.clone()),
                        filter_value_to_value_param(filter_value)?,
                    ])
                },
                //"contains_jsonb" => SQLFragment::new("\"$I\" @> $V", vec![field_name, filter_value_as_jsonb_str]),
                _ => bail!(r#"Invalid filter-type "{filter_type}" specified. Supported: equalTo, in, contains."#),
            });
        }
    }
    parts.push(SQLFragment::lit(")"));

    let combined_fragment = SQLFragment::merge(parts);
    Ok(combined_fragment)
}
pub fn filter_value_to_value_param(filter_value: &JSONValue) -> Result<SQLParam, Error> {
    match filter_value {
        JSONValue::String(val) => Ok(SQLParam::Value(val.to_owned())),
        JSONValue::Number(val) => Ok(SQLParam::Value(val.to_string())),
        JSONValue::Bool(val) => Ok(SQLParam::Value(val.to_string())),
        _ => {
            //SQLParam::Value(filter_value.to_string().replace('\"', "'").replace('[', "(").replace(']', ")"))
            bail!("Conversion from this type of json-value ({filter_value:?}) to a SQLParam is not yet implemented. Instead, provide one of: String, Number, Bool");
        },
    }
}

pub fn entry_matches_filter(entry: &RowData, filter: &Filter) -> Result<bool, Error> {
    if filter.is_none() { return Ok(true); }
    let filter = filter.as_ref().unwrap();

    for (field_name, field_filters) in filter.as_object().with_context(|| "Filter package was not an object!")? {
        // consider "field doesn't exist" to be the same as "field exists, and is set to null" (since that's how the filter-system is meant to work)
        let field_value = entry.get(field_name).or(Some(&serde_json::Value::Null)).unwrap();
        
        //if let Some((filter_type, filter_value)) = field_filters.as_object().unwrap().iter().next() {
        for (filter_type, filter_value) in field_filters.as_object().with_context(|| "Filter entry for field was not an object!")? {
            match filter_type.as_str() {
                "equalTo" => {
                    if field_value != filter_value {
                        return Ok(false);
                    }
                },
                // see: https://www.postgresql.org/docs/current/functions-comparisons.html
                "in" => {
                    if !filter_value.as_array().with_context(|| "Filter value was not an array!")?.contains(field_value) {
                        return Ok(false);
                    }
                },
                // atm, we are assuming the caller is using "contains" in the array sense (ie. array contains the item specified): https://www.postgresql.org/docs/current/functions-array.html
                // but support for other versions (eg. "contains json-subtree") may be added in the future
                "contains" => {
                    //for val_to_find_in_field in filter_value.as_array().with_context(|| "Filter value was not an array!")? {
                    let val_to_find_in_field = filter_value;
                    if !field_value.as_array().with_context(|| "Field value was not an array!")?.contains(val_to_find_in_field) {
                        return Ok(false);
                    }
                },
                _ => panic!(r#"Invalid filter-type "{filter_type}" specified. Supported: equalTo, in, contains."#),
            }
        }
    }
    Ok(true)
}

// example filter: Some(Object({"id": Object({"equalTo": String("t5gRdPS9TW6HrTKS2l2IaZ")})}))