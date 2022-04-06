use std::{fmt::Display, iter::{once, empty}};
use anyhow::{anyhow, bail, Context, Error};
use indexmap::IndexMap;
use rust_macros::{wrap_slow_macros, unchanged};
use serde::Serialize;
use crate::{utils::general::{extensions::IteratorV, general::match_cond_to_iter}, store::live_queries_::lq_param::LQParam};
use itertools::{chain, Itertools};
use serde_json::Map;
use tokio_postgres::types::ToSql;
use crate::{utils::type_aliases::JSONValue};
use super::{sql_fragment::{SQLFragment, SF}, postgres_parsing::RowData, sql_param::{SQLIdent, json_value_to_sql_value_param}};

//pub type Filter = Option<Map<String, JSONValue>>;
pub type FilterInput = JSONValue; // we use JSONValue, because it has the InputType trait (unlike Map<...>, for some reason)

wrap_slow_macros!{

#[derive(Debug, Serialize)]
pub struct QueryFilter {
    pub field_filters: IndexMap<String, FieldFilter>,
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
                let op: FilterOp = match op_json.as_str() {
                    "equalTo" => FilterOp::EqualsX(op_val_json.clone()),
                    "in" => {
                        let vals = op_val_json.clone().as_array().ok_or(anyhow!("Filter-op of type \"in\" requires an array value!"))?;
                        FilterOp::IsWithinX(vals.to_vec())
                    },
                    "contains" => {
                        let vals = op_val_json.clone().as_array().ok_or(anyhow!("Filter-op of type \"contains\" requires an array value!"))?;
                        FilterOp::ContainsAllOfX(vals.to_vec())
                    },
                    _ => bail!(r#"Invalid filter-op "{op_json}" specified. Supported: equalTo, in, contains."#),
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

#[derive(Default, Clone, Debug, Serialize)]
pub struct FieldFilter {
    pub filter_ops: Vec<FilterOp>,
}

#[derive(Debug, Clone, Serialize)]
pub enum FilterOp {
    EqualsX(JSONValue),
    IsWithinX(Vec<JSONValue>),
    ContainsAllOfX(Vec<JSONValue>),
}

}

pub fn entry_matches_filter(entry: &RowData, filter: &QueryFilter) -> Result<bool, Error> {
    for (field_name, field_filter) in filter.field_filters.iter() {
        // consider "field doesn't exist" to be the same as "field exists, and is set to null" (since that's how the filter-system is meant to work)
        let field_value = entry.get(field_name).or(Some(&serde_json::Value::Null)).unwrap();
        
        for op in field_filter.filter_ops {
            match op {
                FilterOp::EqualsX(val) => {
                    if field_value != &val {
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
            }
        }
    }
    Ok(true)
}