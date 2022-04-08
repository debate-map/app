use std::iter::{once, empty};
use std::{collections::HashMap, sync::Arc};
use std::{any::TypeId, pin::Pin, task::{Poll, Waker}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}, cell::RefCell};
use anyhow::{anyhow, bail, Context, Error, ensure};
use async_graphql::{Result, async_stream::{stream, self}, OutputType, Object, Positioned, parser::types::Field};
use deadpool_postgres::Pool;
use flume::Sender;
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt, TryStreamExt};
use hyper::Body;
use indexmap::IndexMap;
use itertools::{chain, Itertools};
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use serde_json::{json, Map};
use tokio_postgres::{Client, Row, types::ToSql, Statement};
use uuid::Uuid;
use metrics::{counter, histogram, increment_counter};
use tokio::sync::RwLock;

use crate::utils::db::filter::{QueryFilter, FilterOp};
use crate::utils::db::sql_fragment::{SF};
use crate::utils::db::postgres_parsing::RowData;
use crate::utils::db::sql_param::{json_value_to_sql_value_param, SQLIdent, SQLParam};
use crate::utils::general::extensions::IteratorV;
use crate::utils::general::general::{match_cond_to_iter};
use crate::utils::mtx::mtx::{new_mtx, Mtx};
use crate::{store::live_queries::{LQStorageWrapper, LQStorage, DropLQWatcherMsg}, utils::{type_aliases::JSONValue, db::{sql_fragment::{SQLFragment}}, general::general::to_anyhow,}};
use super::lq_group::LQGroup;
use super::lq_instance::LQInstance;
use super::lq_param::LQParam;

/// Use this struct to collect multiple queries and execute them in one go as a "batched query".
/// It can also be used as a convenience wrapper around executing a single query; but for most standalone queries, `get_entries_in_collection[_basic]` will be more appropriate.
//#[derive(Default)]
pub struct LQBatch {
    // from LQGroup
    pub table_name: String,
    pub filter_shape: QueryFilter,
    
    pub query_instances: RwLock<IndexMap<String, Arc<LQInstance>>>,
    pub execution_time: Option<f64>,
}
impl LQBatch {
    pub fn new(table_name: String, filter_shape: QueryFilter) -> Self {
        Self {
            table_name,
            filter_shape,
            query_instances: RwLock::default(),
            execution_time: None,
        }
    }

    /// Returns a set of LQParam instances with filler values; used for generating the column-names for the temp-table holding the param-sets.
    pub fn lq_param_prototypes(&self) -> Vec<LQParam> {
        // doesn't matter what these are; just need filler values
        let lq_index_filler = 0;
        //let filter_op_filler = FilterOp::EqualsX(JSONValue::String("n/a".to_owned()));

        chain!(
            once(LQParam::LQIndex(lq_index_filler)),
            self.filter_shape.field_filters.iter().flat_map(|(field_name, field_filter)| {
                field_filter.filter_ops.iter().enumerate().map(|(op_i, op)| {
                    //LQParam::FilterOpValue(field_name.to_owned(), op_i, filter_op_filler.clone())
                    LQParam::FilterOpValue(field_name.to_owned(), op_i, op.clone())
                }).collect_vec()
            }).collect_vec()
        ).collect_vec()
    }

    pub async fn execute(&self, ctx: &async_graphql::Context<'_>, parent_mtx: Option<&Mtx>)
        //-> Result<Vec<RowData>, Error>
        -> Result<(), Error>
    {
        new_mtx!(mtx, "1:wait for pg-client", parent_mtx);
        //let client = ctx.data::<Client>().unwrap();
        let pool = ctx.data::<Pool>().unwrap();
        let client = pool.get().await.unwrap();
        //mtx.current_section_extra_info = Some(format!("@table_name:{} @filters_sql:{}", instance.table_name, filters_sql));

        let query_instances = self.query_instances.read().await;
        let query_instance_vals: Vec<&Arc<LQInstance>> = query_instances.values().collect();
        let lq_last_index = query_instance_vals.len() - 1;

        mtx.section("2:prepare the combined query");
        let (sql_text, params) = {
            let lq_param_protos = self.lq_param_prototypes();

            // each entry of the root-chain is considered its own line, with `merge_lines()` adding line-breaks between them
            let mut combined_sql = SF::merge_lines(chain!(
                chain!(
                    SF::lit_once("WITH lq_param_sets("),
                    lq_param_protos.iter().enumerate().map(|(i, proto)| -> Result<SQLFragment, Error> {
                        Ok(SF::merge(chain!(
                            match_cond_to_iter(i > 0, once(SF::lit(", ")), empty()),
                            Some(SQLIdent::param(proto.name())?.into_ident_fragment()?),
                        ).collect_vec()))
                    }).try_collect2::<Vec<_>>()?,
                    SF::lit_once(") AS (")
                ),
                SF::lit_once("VALUES"),
                query_instance_vals.iter().enumerate().map(|(lq_index, lq_instance)| -> Result<SQLFragment, Error> {
                    let lq_param_instances = lq_param_protos.iter().map(|proto| -> Result<LQParam, Error> {
                        proto.instantiate_param_using_lq_instance_data(lq_index, lq_instance)
                    }).try_collect2::<Vec<_>>()?;

                    Ok(SF::merge(chain!(
                        SF::lit_once("("),
                        lq_param_instances.iter().enumerate().map(|(lq_param_i, lq_param)| -> Result<SQLFragment, Error> {
                            Ok(SF::merge(chain!(
                                match_cond_to_iter(lq_param_i > 0, once(SF::lit(", ")), empty()),
                                once(lq_param.get_sql_for_value()?),
                            ).collect_vec()))
                        }).try_collect2::<Vec<_>>()?,
                        SF::lit_once(")"),
                        match_cond_to_iter(lq_index < lq_last_index, SF::lit_once(","), empty()),
                    ).collect_vec()))
                }).try_collect2::<Vec<_>>()?,
                SF::lit_once(")"),
                SF::new_once("SELECT * FROM $I", vec![SQLIdent::param(self.table_name.clone())?]),
                SF::lit_once("JOIN lq_param_sets ON ("),
                match_cond_to_iter(
                    // if the only lq-param is the "lq_index" one, then use an always-true expression for the "JOIN ON" section
                    lq_param_protos.len() <= 1,
                    SF::lit_once("'1' = '1'"),
                    lq_param_protos.iter()
                        // in this section, we only care about the FilterOpValue lq-params
                        .filter(|proto| {
                            match proto {
                                LQParam::FilterOpValue(..) => true,
                                LQParam::LQIndex(..) => false,
                            }
                        })
                        .map(|proto| -> Result<SQLFragment, Error> {
                            proto.get_sql_for_application(&self.table_name, "lq_param_sets")
                        }).try_collect2::<Vec<_>>()?.into_iter(),
                    ),
                SF::lit_once(") ORDER BY lq_index;"),
            ).collect_vec());
            combined_sql.into_query_args()?
        };

        mtx.section("3:execute the combined query");
        println!("Executing query-batch. @sql_text:{} @params:{:?}", sql_text, params);
        let rows: Vec<Row> = client.query_raw(&sql_text, params).await.map_err(to_anyhow)?
            .try_collect().await.map_err(to_anyhow)?;

        mtx.section("4:collect the rows into groups (while converting rows to row-data structs)");
        let mut lq_results: Vec<Vec<RowData>> = query_instance_vals.iter().map(|_| vec![]).collect();
        for row in rows {
            let lq_index: i64 = row.get("lq_index");
            // convert to RowData structs (slightly more ergonomic in rust code [why exactly?])
            let row_data = postgres_row_to_row_data(row);
            lq_results[lq_index as usize].push(row_data);
        }

        mtx.section("5:sort the entries within each result-set");
        let lq_results_converted: Vec<Vec<RowData>> = lq_results.into_iter().map(|mut lq_results| {
            // sort by id, so that order of our results here is consistent with order after live-query-updating modifications (see live_queries.rs)
            lq_results.sort_by_key(|row_data| {
                let id: String = row_data.get("id").unwrap().as_str().unwrap().to_owned();
                id
            });
            lq_results
        }).collect();

        mtx.section("6:commit the new result-sets");
        for (i, lq_results) in lq_results_converted.into_iter().enumerate() {
            let lq_instance = query_instance_vals.get(i).unwrap();
            lq_instance.set_last_entries(lq_results).await;
        }

        //Ok(lq_results_converted)
        Ok(())
    }
}

//pub fn row_to_json_value(row: Row) -> JSONValue {}
pub fn postgres_row_to_row_data(row: Row) -> RowData {
    let mut result: Map<String, JSONValue> = Map::new();
    for column in row.columns() {
        let name = column.name();
        let value = row.get(name);
        result.insert(name.to_string(), value);
    }
    result
}