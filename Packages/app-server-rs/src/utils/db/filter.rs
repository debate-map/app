use anyhow::{bail, Context, Error};
use serde_json::Map;
use crate::{store::live_queries::RowData, utils::type_aliases::JSONValue};

pub type Filter = Option<JSONValue>; // we use JSONValue, because it has the InputType trait (unlike Map<...>, for some reason)
//pub type Filter = Option<Map<String, JSONValue>>;

pub fn get_sql_for_filters(filter: &Filter) -> Result<String, Error> {
    if filter.is_none() { return Ok("".to_owned()); }
    let filter = filter.as_ref().unwrap();

    let mut parts: Vec<String> = vec![];
    // todo: replace this code-block with one that is safe (ie. uses escaping and such)
    for (field_name, field_filters) in filter.as_object().unwrap() {
        //if let Some((filter_type, filter_value)) = field_filters.as_object().unwrap().iter().next() {
        for (filter_type, filter_value) in field_filters.as_object().unwrap() {
            parts.push(match filter_type.as_str() {
                "equalTo" => format!("\"{field_name}\" = {}", filter_value.to_string().replace('\"', "'")),
                "in" => format!("\"{field_name}\" IN {}", filter_value.to_string().replace('\"', "'").replace('[', "(").replace(']', ")")),
                // see: https://stackoverflow.com/a/54069718
                //"contains" => format!("ANY(\"{field_name}\") = {}", filter_value.to_string().replace("\"", "'")),
                "contains" => format!("\"{field_name}\" @> {}", "'{".to_owned() + &filter_value.to_string() + "}'"),
                //"contains_jsonb" => format!("\"{field_name}\" @> {filter_value_as_jsonb_str}"),
                _ => bail!(r#"Invalid filter-type "{filter_type}" specified. Supported: equalTo, in, contains."#),
            });
        }
    }
    let result = "(".to_owned() + &parts.join(") AND (") + ")";
    Ok(result)
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