use std::{fmt::Display, sync::atomic::AtomicI32, iter::{once, Once, empty}};
use rust_shared::anyhow::{anyhow, bail, Context, Error, ensure};
use rust_shared::itertools::{Itertools, chain};
use regex::{Regex, Captures};
use rust_shared::serde_json::Map;
use rust_shared::tokio_postgres::types::ToSql;
use crate::{utils::{db::{filter::FilterOp, sql_param::{SQLParam}, sql_fragment::{SQLFragment, SF}, sql_ident::SQLIdent}, general::{general::match_cond_to_iter, extensions::IteratorV}}};

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
                //SQLParam::Value_Float(f64::try_from(*lq_index)?).into_value_fragment() // this doesn't work fsr
                //SQLParam::Value_Float(*lq_index as f64).into_value_fragment()
                //SQLParam::Value_Int(*lq_index as i64).into_value_fragment()
                Ok(SQLFragment::value(*lq_index as i64))
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
                    SF::ident(SQLIdent::new(left_container_name.to_owned())?),
                    SF::lit("."),
                    SF::ident(SQLIdent::new(field_name.to_owned())?),
                ]);
                let lq_param_name_fragment = SF::merge(vec![
                    SF::ident(SQLIdent::new(right_container_name.to_owned())?),
                    SF::lit("."),
                    SF::ident(SQLIdent::new(self.name())?),
                ]);
                
                Ok(op.get_sql_for_application(field_name_fragment, lq_param_name_fragment))
            }
        }
    }
}