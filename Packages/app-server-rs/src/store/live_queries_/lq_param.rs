use std::{fmt::Display, sync::atomic::AtomicI32, iter::{once, Once, empty}};
use anyhow::{anyhow, bail, Context, Error, ensure};
use itertools::{Itertools, chain};
use regex::{Regex, Captures};
use serde_json::Map;
use tokio_postgres::types::ToSql;
use crate::{utils::{type_aliases::JSONValue, db::{filter::FilterOp, sql_param::{SQLParam, json_value_to_sql_value_param, SQLIdent}, sql_fragment::{SQLFragment, SF}}, general::{general::match_cond_to_iter, extensions::IteratorV}}};

use super::lq_instance::LQInstance;

pub enum LQParam {
    LQIndex(usize),
    /// Tuple meaning: (field_name, index_of_filter_op_for_field, filter_op)
    FilterOpValue(String, usize, FilterOp),
}
impl LQParam {
    /*pub fn new(name: String, source_field__name: Option<String>, source_field__param_index: Option<usize>) -> Result<SQLParamInfo, Error> {
        if let Some(field_name) = source_field__name {
            ensure!(name != "lq_index", "Invalid name for param, for field \"{field_name}\"; the identifier \"sql_index\" is reserved!");
        }
        Ok(Self { name, source_field__name, source_field__param_index })
    }*/
    pub fn name(&self) -> String {
        match self {
            LQParam::LQIndex(_) => "lq_index".to_owned(),
            LQParam::FilterOpValue(field_name, op_index, _) => {
                format!("{}_{}", field_name, op_index)
            }
        }
    }

    pub fn instantiate_param_using_lq_instance_data(&self, lq_index: usize, lq_instance: &LQInstance) -> Result<LQParam, Error> {
        let proto = self;
        match proto {
            LQParam::LQIndex(_) => Ok(LQParam::LQIndex(lq_index)),
            LQParam::FilterOpValue(field_name, op_i, _) => {
                let field_filter_for_lq_instance = lq_instance.filter.field_filters.get(field_name)
                    .ok_or(anyhow!("LQ-instance had no filter-value for field \"{field_name}\"."))?;
                let filter_op = field_filter_for_lq_instance.filter_ops.get(*op_i)
                    .ok_or(anyhow!("Field-filter had no filter-op with index \"{op_i}\". @path:{}/{} @lq_instance_filter:{}", field_name, op_i, lq_instance.filter))?;
                Ok(LQParam::FilterOpValue(field_name.to_owned(), *op_i, filter_op.clone()))
            }
        }
    }

    pub fn get_sql_for_value(&self) -> Result<SQLFragment, Error> {
        match self {
            LQParam::LQIndex(lq_index) => {
                // todo: have this output a number rather than string
                SQLParam::Value_String(lq_index.to_string()).into_value_fragment()
            },
            LQParam::FilterOpValue(_, _, op) => {
                op.get_sql_for_value()
            }
        }
    }

    pub fn get_sql_for_application(&self, left_container_name: &str, right_container_name: &str) -> Result<SQLFragment, Error> {
        match self {
            LQParam::LQIndex(..) => bail!("Invalid call to get_sql_for_application, for an LQParam::LQIndex."),
            LQParam::FilterOpValue(field_name, _, op) => {
                let field_name_fragment = SF::merge(vec![
                    SQLIdent::param(left_container_name.to_owned())?.into_ident_fragment()?,
                    SF::lit("."),
                    SQLIdent::param(field_name.to_owned())?.into_ident_fragment()?,
                ]);
                let lq_param_name_fragment = SF::merge(vec![
                    SQLIdent::param(right_container_name.to_owned())?.into_ident_fragment()?,
                    SF::lit("."),
                    SQLIdent::param(self.name())?.into_ident_fragment()?,
                ]);
                
                Ok(op.get_sql_for_application(field_name_fragment, lq_param_name_fragment))
            }
        }
    }
}

pub fn json_vals_to_sql_array_fragment(json_vals: &Vec<JSONValue>) -> Result<SQLFragment, Error> {
    Ok(SF::merge(chain!(
        SF::lit_once("array["),
        json_vals_to_fragments(json_vals)?,
        SF::lit_once("]"),
    ).collect_vec()))
}
pub fn json_vals_to_fragments(json_vals: &Vec<JSONValue>) -> Result<Vec<SQLFragment>, Error> {
    json_vals.iter().enumerate().map(|(i, val)| -> Result<SQLFragment, Error> {
        Ok(SQLFragment::merge(chain!(
            match_cond_to_iter(i > 0, SF::lit_once(","), empty()),
            once(json_value_to_sql_value_param(val)?.into_value_fragment()?),
        ).collect_vec()))
    }).try_collect2::<Vec<_>>()
}