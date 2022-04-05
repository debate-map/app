use std::{collections::HashMap, sync::Arc};
use std::{any::TypeId, pin::Pin, task::{Poll, Waker}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}, cell::RefCell};
use anyhow::{bail, Context, Error};
use async_graphql::{Result, async_stream::{stream, self}, OutputType, Object, Positioned, parser::types::Field};
use deadpool_postgres::Pool;
use flume::Sender;
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt, TryStreamExt};
use hyper::Body;
use itertools::{chain, Itertools};
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use serde_json::{json, Map};
use tokio_postgres::{Client, Row, types::ToSql, Statement};
use uuid::Uuid;
use metrics::{counter, histogram, increment_counter};
use tokio::sync::RwLock;

use crate::utils::db::filter::QueryFilter;
use crate::utils::db::fragments::{SQLIdent, SF};
use crate::utils::db::postgres_parsing::RowData;
use crate::utils::general::extensions::IteratorV;
use crate::utils::mtx::mtx::{new_mtx, Mtx};
use crate::{store::live_queries::{LQStorageWrapper, LQStorage, DropLQWatcherMsg}, utils::{type_aliases::JSONValue, db::{filter::get_sql_for_filters, fragments::{SQLFragment, SQLParam}}, general::general::to_anyhow,}};
use super::lq_group::LQGroup;
use super::lq_instance::LQInstance;

/// A "batch" may be as small as one query, if first/isolated.
#[derive(Default)]
pub struct LQBatch {
    pub query_instances: RwLock<HashMap<String, Arc<LQInstance>>>,
    pub execution_time: f64,
}

impl LQGroup {
    pub fn param_names(&self) -> Vec<String> {
        self.filter_shape.field_filters.keys().map(|a| a.clone()).collect()
    }

    pub async fn execute_lq_batch(&self, ctx: &async_graphql::Context<'_>, parent_mtx: Option<&Mtx>)
        //-> Result<Vec<RowData>, Error>
        -> Result<(), Error>
    {
        new_mtx!(mtx, "1:wait for pg-client", parent_mtx);
        //let client = ctx.data::<Client>().unwrap();
        let pool = ctx.data::<Pool>().unwrap();
        let client = pool.get().await.unwrap();
        //mtx.current_section_extra_info = Some(format!("@table_name:{} @filters_sql:{}", instance.table_name, filters_sql));

        let query_instances = self.query_instances.read().await;

        mtx.section("2:execute the combined query");
        let (sql_text, params) = {
            let param_names = self.param_names();
            // each entry of the root-chain is considered its own line, with `merge_lines()` adding line-breaks between them
            let mut combined_sql = SF::merge_lines(chain!(
                chain!(
                    SF::lit_once("WITH params(lq_index, "),
                    param_names.iter().enumerate().map(|(i, name)| -> Result<SQLFragment, Error> {
                        Ok(SF::merge(vec![
                            if i > 0 { Some(SF::lit(",")) } else { None },
                            Some(SF::new("$I", vec![SQLIdent::param(name.clone())?])),
                        ].into_iter().filter_map(|a| a).collect_vec()))
                    }).try_collect2::<Vec<_>>()?,
                    SF::lit_once(") AS (")
                ),
                SF::lit_once("VALUES"),
                SF::lit_once(")"),
                SF::new_once("SELECT * FROM $I", vec![SQLIdent::param(self.table_name.clone())?]),
                SF::lit_once("JOIN params ON ("),
                param_names.iter().enumerate().map(|(i, name)| -> Result<SQLFragment, Error> {
                    /*let condition_fragment = SF::new("$I.$I = params.$I", vec![
                        SQLIdent::param(self.table_name.clone())?,
                        SQLIdent::param(name.clone())?,
                        SQLIdent::param(name.clone())?
                    ]);*/
                    // break point
                    let condition_fragment = get_sql_for_filters(&instance.filter)
                        .with_context(|| format!("Got error while getting sql for filter:{:?}", instance.filter))?;
                    Ok(SF::merge(vec![
                        if i > 0 { Some(SF::lit(",")) } else { None },
                        Some(condition_fragment),
                    ].into_iter().filter_map(|a| a).collect_vec()))
                }).try_collect2::<Vec<_>>()?,
                SF::lit_once(") ORDER BY index;"),
            ).collect_vec());
            combined_sql.into_query_args()?
        };
        println!("Executing query-batch. @sql_text:{} @params:{:?}", sql_text, params);
        let rows: Vec<Row> = client.query_raw(&sql_text, params).await.map_err(to_anyhow)?
            .try_collect().await.map_err(to_anyhow)?;

        mtx.section("3:collect the rows into groups (while converting rows to row-data structs)");
        let query_instance_vals: Vec<&Arc<LQInstance>> = query_instances.values().collect();
        let mut lq_results: Vec<Vec<RowData>> = query_instance_vals.iter().map(|_| vec![]).collect();
        for row in rows {
            let lq_index: i64 = row.get("lq_index");
            // convert to RowData structs (slightly more ergonomic in rust code [why exactly?])
            let row_data = postgres_row_to_row_data(row);
            lq_results[lq_index as usize].push(row_data);
        }

        mtx.section("4:sort the entries within each result-set");
        let lq_results_converted: Vec<Vec<RowData>> = lq_results.into_iter().map(|mut lq_results| {
            // sort by id, so that order of our results here is consistent with order after live-query-updating modifications (see live_queries.rs)
            lq_results.sort_by_key(|row_data| {
                let id: String = row_data.get("id").unwrap().as_str().unwrap().to_owned();
                id
            });
            lq_results
        }).collect();

        mtx.section("5:commit the new result-sets");
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