use std::{fmt::Display, iter::{once, empty}};
use rust_shared::{anyhow::{anyhow, bail, Context, Error, ensure}, utils::{type_aliases::{JSONValue, RowData}, general_::extensions::IteratorV}, serde_json};
use rust_shared::indexmap::IndexMap;
use rust_shared::async_graphql;
use rust_shared::rust_macros::{wrap_slow_macros, unchanged};
use rust_shared::serde::{Serialize, Deserialize};
use crate::{utils::{general::{general::match_cond_to_iter}}, store::live_queries_::lq_param::{LQParam}};
use rust_shared::itertools::{chain, Itertools};
use rust_shared::serde_json::Map;
use rust_shared::tokio_postgres::types::ToSql;
use rust_shared::serde;
use super::{sql_fragment::{SQLFragment, SF}, sql_ident::{SQLIdent}, sql_param::SQLParamBoxed};

//pub type Filter = Option<Map<String, JSONValue>>;
pub type FilterInput = JSONValue; // we use JSONValue, because it has the InputType trait (unlike Map<...>, for some reason)

wrap_slow_macros!{

/// Structure specifying a set of filters used for rows in a table.
/// This struct may contain the actual values that are being filtered for, OR it may just contain the "shape" of a set of filters. (as checked by ensure_shape_only)
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryFilter {
    pub field_filters: IndexMap<String, FieldFilter>,
}

}

impl QueryFilter {
    pub fn empty() -> Self {
        Self {
            field_filters: IndexMap::new(),
        }
    }
    // example filter: Some(Object({"id": Object({"equalTo": String("t5gRdPS9TW6HrTKS2l2IaZ")})}))
    pub fn from_filter_input_opt(input: &Option<FilterInput>) -> Result<QueryFilter, Error> {
        match input {
            Some(input) => Self::from_filter_input(input),
            // if no input, just return an empty filter (has same effect as "no filter", so best to unify)
            None => Ok(QueryFilter::empty()),
        }
    }
    pub fn from_filter_input(input: &FilterInput) -> Result<QueryFilter, Error> {
        let mut result = QueryFilter { field_filters: IndexMap::new() };

        for (field_name, field_filters_json) in input.as_object().ok_or_else(|| anyhow!("Filter root-structure was not an object!"))?.iter() {
            let mut field_filter = FieldFilter::default();
            //if let Some((filter_type, filter_value)) = field_filters.as_object().unwrap().iter().next() {
            for (op_json, op_val_json) in field_filters_json.as_object().ok_or_else(|| anyhow!("Filter-structure for field {field_name} was not an object!"))? {
                let op_val_json_clone = op_val_json.clone();
                let op: FilterOp = match op_json.as_str() {
                    "notEqualTo" => FilterOp::NotEqualsX(op_val_json_clone),
                    "equalTo" => FilterOp::EqualsX(op_val_json_clone),
                    "in" => {
                        let vals = op_val_json_clone.as_array().ok_or(anyhow!("Filter-op of type \"in\" requires an array value!"))?;
                        FilterOp::IsWithinX(vals.to_vec())
                    },
                    "contains" => {
                        let vals = op_val_json_clone.as_array().ok_or(anyhow!("Filter-op of type \"contains\" requires an array value!"))?;
                        FilterOp::ContainsAllOfX(vals.to_vec())
                    },
                    "containsAny" => {
                        let vals = op_val_json_clone.as_array().ok_or(anyhow!("Filter-op of type \"containsAny\" requires an array value!"))?;
                        FilterOp::ContainsAnyOfX(vals.to_vec())
                    },
                    _ => bail!(r#"Invalid filter-op "{op_json}" specified. Supported: equalTo, in, contains, containsAny."#),
                };
                field_filter.filter_ops.push(op);
            }
            result.field_filters.insert(field_name.to_owned(), field_filter);
        }

        Ok(result)
    }

    pub fn is_empty(&self) -> bool {
        self.field_filters.len() == 0
    }

    pub fn ensure_shape_only(&self) -> Result<(), Error> {
        for (_field_name, field_filter) in &self.field_filters {
            for op in &field_filter.filter_ops {
                match op {
                    FilterOp::NotEqualsX(val) => ensure!(val.is_null()),
                    FilterOp::EqualsX(val) => ensure!(val.is_null()),
                    FilterOp::IsWithinX(vals) => for val in vals { ensure!(val.is_null()); },
                    FilterOp::ContainsAllOfX(vals) => for val in vals { ensure!(val.is_null()); },
                    FilterOp::ContainsAnyOfX(vals) => for val in vals { ensure!(val.is_null()); },
                };
            }
        }
        Ok(())
    }

    /// This method does not use batching; if you want batching, use `LQBatch`.
    pub fn get_sql_for_application(&self) -> Result<SQLFragment, Error> {
        if self.is_empty() {
            return Ok(SF::lit(""));
        }
    
        let mut parts: Vec<SQLFragment> = vec![];
        parts.push(SF::lit("("));
        for (i, (field_name, field_filter)) in self.field_filters.iter().enumerate() {
            if i > 0 {
                parts.push(SF::lit(") AND ("));
            }
            //if let Some((filter_type, filter_value)) = field_filters.as_object().unwrap().iter().next() {
            for op in field_filter.filter_ops.iter() {
                parts.push(op.get_sql_for_application(
                    SF::ident(SQLIdent::new(field_name.clone())?),
                    op.get_sql_for_value()?,
                ));
            }
        }
        parts.push(SF::lit(")"));
    
        let combined_fragment = SF::merge(parts);
        Ok(combined_fragment)
    }
}
impl Clone for QueryFilter {
    fn clone(&self) -> Self {
        /*let mut field_filters: IndexMap<String, FieldFilter> = IndexMap::new();
        for (key, value) in self.field_filters.iter() {
            field_filters.insert(key.clone(), value.clone());
        }
        Self { field_filters }*/
        Self { field_filters: self.field_filters.clone() }
    }
}
impl Display for QueryFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        /*if self.is_empty() {
            f.write_str("n/a");
        } else {
            f.write_fmt(format_args!("{self:?}"));
        }
        Ok(())*/
        // is this correct?
        if self.is_empty() {
            "n/a".fmt(f)
        } else {
            format_args!("{self:?}").fmt(f)
        }
    }
}

wrap_slow_macros!{

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
pub struct FieldFilter {
    pub filter_ops: Vec<FilterOp>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FilterOp {
    NotEqualsX(JSONValue),
    EqualsX(JSONValue),
    IsWithinX(Vec<JSONValue>),
    ContainsAllOfX(Vec<JSONValue>),
    ContainsAnyOfX(Vec<JSONValue>),
}

}

impl FilterOp {
    /// The job of this function is just to provide the SQL-fragment for the value being compared against.
    /// The SQL for the "comparison operator" is provided in the "match" within the `get_sql_for_application` method below.
    pub fn get_sql_for_value(&self) -> Result<SQLFragment, Error> {
        Ok(match self {
            FilterOp::NotEqualsX(val) => {

                json_value_to_guessed_sql_value_param_fragment(&val)?
            },
            FilterOp::EqualsX(val) => {
                /*let temp = json_value_to_guessed_sql_value_param(&val)?;
                SF::value(*temp)*/
                json_value_to_guessed_sql_value_param_fragment(&val)?
            },
            FilterOp::IsWithinX(vals) => json_vals_to_sql_array_fragment(&vals)?,
            FilterOp::ContainsAllOfX(vals) => json_vals_to_sql_array_fragment(&vals)?,
            FilterOp::ContainsAnyOfX(vals) => json_vals_to_sql_array_fragment(&vals)?,
        })
    }

    pub fn get_sql_for_application(&self, ref_to_val_in_db: SQLFragment, ref_to_val_in_filter_op: SQLFragment) -> SQLFragment {
        let bracket_plus_val_in_db = SF::merge(vec![
            SF::lit("("),
            ref_to_val_in_db,
        ]);
        let bracket_plus_val_in_filter_op = SF::merge(vec![
            ref_to_val_in_filter_op,
            SF::lit(")"),
        ]);
        match self {
            FilterOp::NotEqualsX(_) => SF::merge(vec![
                bracket_plus_val_in_db,
                SF::lit(" != "),
                bracket_plus_val_in_filter_op,
            ]),
            FilterOp::EqualsX(_) => SF::merge(vec![
                bracket_plus_val_in_db,
                SF::lit(" = "),
                bracket_plus_val_in_filter_op,
            ]),
            FilterOp::IsWithinX(_) => SF::merge(vec![
                bracket_plus_val_in_db,
                //SF::lit(" IN "), // commented; this only works for subqueries, not arrays
                SF::lit(" = ANY("),
                bracket_plus_val_in_filter_op,
                SF::lit(")"),
            ]),
            // see: https://stackoverflow.com/a/54069718
            //"contains" => SF::new("ANY(\"$X\") = $X", vec![field_name, &filter_value.to_string().replace("\"", "'")]),
            FilterOp::ContainsAllOfX(_) => SF::merge(vec![
                bracket_plus_val_in_db,
                SF::lit(" @> "),
                bracket_plus_val_in_filter_op,
            ]),
            //"contains_jsonb" => SF::new("\"$I\" @> $V", vec![field_name, filter_value_as_jsonb_str]),
            FilterOp::ContainsAnyOfX(_) => SF::merge(vec![
                bracket_plus_val_in_db,
                SF::lit(" && "),
                bracket_plus_val_in_filter_op,
            ]),
        }
    }
}

pub fn entry_matches_filter(entry: &RowData, filter: &QueryFilter) -> Result<bool, Error> {
    for (field_name, field_filter) in filter.field_filters.iter() {
        // consider "field doesn't exist" to be the same as "field exists, and is set to null" (since that's how the filter-system is meant to work)
        let field_value = entry.get(field_name).or(Some(&serde_json::Value::Null)).unwrap();
        
        for op in &field_filter.filter_ops {
            match op {
                FilterOp::NotEqualsX(val) => {
                    if field_value == val {
                        return Ok(false);
                    }
                },
                FilterOp::EqualsX(val) => {
                    if field_value != val {
                        return Ok(false);
                    }
                },
                // see: https://www.postgresql.org/docs/current/functions-comparisons.html
                FilterOp::IsWithinX(vals) => {
                    if !vals.contains(field_value) {
                        return Ok(false);
                    }
                },
                // atm, we are assuming the caller is using "contains" in the array sense (ie. array contains all the items specified): https://www.postgresql.org/docs/current/functions-array.html
                // but support for other versions (eg. "contains json-subtree") may be added (as new filter-op-types) in the future
                FilterOp::ContainsAllOfX(vals) => {
                    for val in vals {
                        if !field_value.as_array().with_context(|| "Field value was not an array!")?.contains(&val) {
                            return Ok(false);
                        }
                    }
                },
                FilterOp::ContainsAnyOfX(vals) => {
                    for val in vals {
                        if field_value.as_array().with_context(|| "Field value was not an array!")?.contains(&val) {
                            return Ok(true);
                        }
                    }
                    return Ok(false);
                },
            }
        }
    }
    Ok(true)
}


/// This function tries to convert an anonymous json-value into a type with ToSql implemented, for use as a sql-param.
/// It's a bit inelegant here, in that we assume we want json-value scalars to map to pg-type scalars, and non-scalars to pg-type "jsonb", when that's not necessarily the case.
/// That said, it's sufficient for our purposes, since we only use this for live-query "filters", where these simple rules work fine.
//pub fn json_value_to_guessed_sql_value_param(json_val: &JSONValue) -> Result<SQLParamBoxed, Error> {
pub fn json_value_to_guessed_sql_value_param_fragment(json_val: &JSONValue) -> Result<SQLFragment, Error> {
    match json_val {
        JSONValue::Null => Ok(SF::value(Box::new(Option::<String>::None))),
        JSONValue::Bool(val) => Ok(SF::value(Box::new(*val))),
        JSONValue::Number(val) => {
            if let Some(val_i64) = val.as_i64() {
                return Ok(SF::value(Box::new(val_i64)))
                /*let val_i32 = i32::try_from(val_i64)?;
                return Ok(SQLParam::Value_Int(val_i32));*/
            }
            if let Some(val_f64) = val.as_f64() {
                return Ok(SF::value(Box::new(val_f64)));
            }
            Err(anyhow!("Invalid \"number\":{}", val))
        },
        JSONValue::String(val) => Ok(SF::value(Box::new(val.to_owned()))),
        JSONValue::Array(data) => {
            //if data.iter().all(|a| a.is_string()) { return Ok(SF::value(Box::new(json_val.clone()))) }
            let bool_vals = data.iter().filter(|a| a.is_boolean()).map(|a| a.as_bool().unwrap()).collect_vec();
            let i64_vals = data.iter().filter(|a| a.is_number() && a.as_i64().is_some()).map(|a| a.as_i64().unwrap()).collect_vec();
            let f64_vals = data.iter().filter(|a| a.is_number() && a.as_f64().is_some()).map(|a| a.as_f64().unwrap()).collect_vec();
            let string_vals = data.iter().filter(|a| a.is_string()).map(|a| a.as_str().unwrap().to_owned()).collect_vec();
            /*let array_vals = data.iter().filter(|a| a.is_array()).map(|a| a.as_array().unwrap().to_owned()).collect_vec();
            let object_vals = data.iter().filter(|a| a.is_object()).map(|a| a.as_object().unwrap().to_owned()).collect_vec();*/

            let val_list_lengths = vec![bool_vals.len(), i64_vals.len(), f64_vals.len(), string_vals.len()];
            let most_matches_for_list = val_list_lengths.into_iter().max().unwrap();
            if most_matches_for_list > 0 {
                if bool_vals.len() == most_matches_for_list { return Ok(SF::value(Box::new(bool_vals))) }
                if i64_vals.len() == most_matches_for_list { return Ok(SF::value(Box::new(i64_vals))) }
                if f64_vals.len() == most_matches_for_list { return Ok(SF::value(Box::new(f64_vals))) }
                if string_vals.len() == most_matches_for_list { return Ok(SF::value(Box::new(string_vals))) }
                /*if array_vals.len() == most_matches_for_list { return Ok(SF::value(Box::new(array_vals))) }
                if object_vals.len() == most_matches_for_list { return Ok(SF::value(Box::new(object_vals))) }*/
            }

            // fallback to jsonb
            Ok(SF::value(Box::new(json_val.clone())))
            // todo: make sure this is correct
        },
        JSONValue::Object(_data) => {
            Ok(SF::value(Box::new(json_val.clone())))
            // todo: make sure this is correct
        },
        /*_ => {
            //SQLParam::Value(op_val.to_string().replace('\"', "'").replace('[', "(").replace(']', ")"))
            bail!("Conversion from this type of json-value ({json_val:?}) to a SQLParam is not yet implemented. Instead, provide one of: Null, Bool, Number, String, Array, Object");
        },*/
    }
}
pub fn json_vals_to_sql_array_fragment(json_vals: &Vec<JSONValue>) -> Result<SQLFragment, Error> {
    Ok(SF::merge(chain!(
        SF::lit("array[").once(),
        json_vals_to_fragments(json_vals)?,
        SF::lit("]").once(),
    ).collect_vec()))
}
pub fn json_vals_to_fragments(json_vals: &Vec<JSONValue>) -> Result<Vec<SQLFragment>, Error> {
    json_vals.iter().enumerate().map(|(i, val)| -> Result<SQLFragment, Error> {
        Ok(SQLFragment::merge(chain!(
            match_cond_to_iter(i > 0, SF::lit(",").once(), empty()),
            {
                /*let temp = json_value_to_guessed_sql_value_param(val)?;
                SF::value(*temp).once()*/
                json_value_to_guessed_sql_value_param_fragment(&val)?.once()
            },
        ).collect_vec()))
    }).try_collect2::<Vec<_>>()
}