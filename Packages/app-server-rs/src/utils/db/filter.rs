use std::fmt::Display;
use anyhow::{anyhow, bail, Context, Error};
use indexmap::IndexMap;
use rust_macros::{wrap_slow_macros, unchanged};
use serde::Serialize;
use crate::utils::general::extensions::IteratorV;
use itertools::{chain, Itertools};
use serde_json::Map;
use tokio_postgres::types::ToSql;
use crate::{utils::type_aliases::JSONValue};
use super::{fragments::{SQLFragment, SQLParam, SQLIdent, SF}, postgres_parsing::RowData};

//pub type Filter = Option<Map<String, JSONValue>>;
pub type FilterInput = JSONValue; // we use JSONValue, because it has the InputType trait (unlike Map<...>, for some reason)

//wrap_slow_macros!{

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
                    "equalTo" => FilterOp::EqualsX,
                    "in" => FilterOp::EqualsOneOfX,
                    "contains" => FilterOp::ContainsAllOfX,
                    _ => bail!(r#"Invalid filter-op "{op_json}" specified. Supported: equalTo, in, contains."#),
                };
                field_filter.filter_ops.insert(op, op_val_json.clone());
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
        if self.is_empty() {
            f.write_str("n/a");
        } else {
            f.write_fmt(format_args!("{self:?}"));
        }
        Ok(())
    }
}

#[derive(Default, Clone, Debug, Serialize)]
pub struct FieldFilter {
    pub filter_ops: IndexMap<FilterOp, JSONValue>,
}
#[derive(Eq, Hash, PartialEq, Debug, Clone, Serialize)]
pub enum FilterOp {
    EqualsX,
    /// More precisely: "equals at least one of X"
    EqualsOneOfX,
    ContainsAllOfX,
}

//}

pub fn get_sql_for_filters(filter: &QueryFilter) -> Result<SQLFragment, Error> {
    if filter.is_empty() {
        return Ok(SF::lit(""));
    }

    let mut parts: Vec<SQLFragment> = vec![];
    parts.push(SF::lit("("));
    for (i, (field_name, field_filter)) in filter.field_filters.iter().enumerate() {
        if i > 0 {
            parts.push(SF::lit(") AND ("));
        }
        //if let Some((filter_type, filter_value)) = field_filters.as_object().unwrap().iter().next() {
        for (op, op_val) in field_filter.filter_ops.iter() {
            parts.push(match op {
                FilterOp::EqualsX => SF::new("$I = $V", vec![
                    SQLIdent::param(field_name.clone())?,
                    op_value_to_value_param(&op_val)?,
                ]),
                FilterOp::EqualsOneOfX => {
                    let vals = op_val.as_array().ok_or_else(|| anyhow!("Value for \"in\" filter was not an array!"))?;
                    SF::merge(chain!(
                        SF::new_once("$I IN (", vec![SQLIdent::param(field_name.clone())?]),
                        vals.iter().enumerate().map(|(i, val)| -> Result<Vec<SQLFragment>, Error> {
                            Ok(vec![
                                if i > 0 { Some(SF::lit(",")) } else { None },
                                Some(SF::new("$V", vec![op_value_to_value_param(val)?])),
                            ].into_iter().filter_map(|a| a).collect_vec())
                        }).try_collect2::<Vec<_>>()?.into_iter().flatten().collect_vec(),
                        SF::lit_once(")"),
                    ).collect_vec())
                },
                // see: https://stackoverflow.com/a/54069718
                //"contains" => SF::new("ANY(\"$X\") = $X", vec![field_name, &filter_value.to_string().replace("\"", "'")]),
                FilterOp::ContainsAllOfX => {
                    /*let vals = filter_value.as_array().ok_or_else(|| anyhow!("Value for \"contains\" filter was not an array!"))?;
                    SF::INTERPOLATED_SQL(
                        format!("$I @> '{{{}}}'", vals.iter().map(|_| "$V").collect_vec().join(",")),
                        chain(
                            [SQLParam::Ident(field_name.clone())],
                            vals.iter().map(|a| filter_value_to_value_param(a)).try_collect2::<Vec<SQLParam>>()?,
                        ).collect_vec()
                    )*/
                    
                    //let _val_str = filter_value.as_str().ok_or_else(|| anyhow!("Value for \"contains\" filter was not a string!"))?;

                    // meaning: if the row contains any values in the passed array (read as: if any of the row's values match the passed value) 
                    //SF::new("$I @> '{$V}'", vec![
                        
                    // meaining: if the row contains all values in the passed jsonb array (this only works for json presumably)
                    //SF::new("$I @> cast($V as jsonb)", vec![

                    // meaining: if the row contains all values in the passed array (see: https://stackoverflow.com/a/54069718)
                    //SF::new("$I @> '{$V}'", vec![ // this syntax works in console, but not in prepared statements apparently
                    SF::new("$I @> array[$V]", vec![
                        SQLIdent::new(field_name.clone())?.into_param(),
                        op_value_to_value_param(&op_val)?,
                    ])
                },
                //"contains_jsonb" => SF::new("\"$I\" @> $V", vec![field_name, filter_value_as_jsonb_str]),
            });
        }
    }
    parts.push(SF::lit(")"));

    let combined_fragment = SF::merge(parts);
    Ok(combined_fragment)
}
pub fn op_value_to_value_param(op_val: &JSONValue) -> Result<SQLParam, Error> {
    match op_val {
        JSONValue::String(val) => Ok(SQLParam::Value(val.to_owned())),
        JSONValue::Number(val) => Ok(SQLParam::Value(val.to_string())),
        JSONValue::Bool(val) => Ok(SQLParam::Value(val.to_string())),
        _ => {
            //SQLParam::Value(op_val.to_string().replace('\"', "'").replace('[', "(").replace(']', ")"))
            bail!("Conversion from this type of json-value ({op_val:?}) to a SQLParam is not yet implemented. Instead, provide one of: String, Number, Bool");
        },
    }
}

pub fn entry_matches_filter(entry: &RowData, filter: &QueryFilter) -> Result<bool, Error> {
    for (field_name, field_filter) in filter.field_filters.iter() {
        // consider "field doesn't exist" to be the same as "field exists, and is set to null" (since that's how the filter-system is meant to work)
        let field_value = entry.get(field_name).or(Some(&serde_json::Value::Null)).unwrap();
        
        for (op, op_val) in field_filter.filter_ops.iter() {
            match op {
                FilterOp::EqualsX => {
                    if field_value != op_val {
                        return Ok(false);
                    }
                },
                // see: https://www.postgresql.org/docs/current/functions-comparisons.html
                FilterOp::EqualsOneOfX => {
                    if !op_val.as_array().with_context(|| "Filter value was not an array!")?.contains(field_value) {
                        return Ok(false);
                    }
                },
                // atm, we are assuming the caller is using "contains" in the array sense (ie. array contains the item specified): https://www.postgresql.org/docs/current/functions-array.html
                // but support for other versions (eg. "contains json-subtree") may be added in the future
                FilterOp::ContainsAllOfX => {
                    //for val_to_find_in_field in filter_value.as_array().with_context(|| "Filter value was not an array!")? {
                    let val_to_find_in_field = op_val;
                    if !field_value.as_array().with_context(|| "Field value was not an array!")?.contains(&val_to_find_in_field) {
                        return Ok(false);
                    }
                },
            }
        }
    }
    Ok(true)
}