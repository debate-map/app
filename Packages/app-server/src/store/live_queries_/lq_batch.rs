use std::iter::{once, empty};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::{sync::Arc};
use rust_shared::anyhow::{Error};
use rust_shared::async_graphql::{Result};
use deadpool_postgres::Pool;
use futures_util::{StreamExt, TryFutureExt, TryStreamExt};
use indexmap::IndexMap;
use rust_shared::itertools::{chain, Itertools};
use rust_shared::to_anyhow_with_extra;
use rust_shared::tokio::sync::{RwLock, Semaphore};
use rust_shared::tokio_postgres::types::ToSql;
use rust_shared::tokio_postgres::{Row, RowStream};
use lazy_static::lazy_static;
use tracing::{trace, error};
use crate::db::commands::_command::ToSqlWrapper;
use crate::store::live_queries_::lq_batch_::sql_generator::prepare_sql_query;
use crate::utils::db::filter::{QueryFilter};
use crate::utils::db::pg_row_to_json::postgres_row_to_row_data;
use crate::utils::db::sql_fragment::{SF};
use crate::utils::type_aliases::RowData;
use crate::utils::db::sql_param::{SQLParam};
use crate::utils::general::general::{match_cond_to_iter, AtomicF64};
use crate::utils::mtx::mtx::{new_mtx, Mtx};
use crate::utils::type_aliases::PGClientObject;
use crate::{utils::{db::{sql_fragment::{SQLFragment}}}};

use super::lq_instance::LQInstance;
use super::lq_param::LQParam;

/// Use this struct to collect multiple queries and execute them in one go as a "batched query".
/// It can also be used as a convenience wrapper around executing a single query; but for most standalone queries, `get_entries_in_collection[_basic]` will be more appropriate.
//#[derive(Default)]
pub struct LQBatch {
    // from LQGroup
    pub table_name: String,
    pub filter_shape: QueryFilter,
    //pub index_in_group: usize,
    
    /// Note that this map gets cleared as soon as its entries are committed to the wider LQGroup. (necessary, since these LQBatch structs are recycled)
    pub query_instances: IndexMap<String, Arc<LQInstance>>,
    //pub execution_time: Option<f64>,
    //execution_time: AtomicF64, // a value of -1 means "not yet set", ie. execution hasn't happened yet

    //pub execution_in_progress: Mutex<bool>,
    pub executions_completed: usize,
}
impl LQBatch {
    pub fn new(table_name: String, filter_shape: QueryFilter) -> Self {
        Self {
            table_name,
            filter_shape,
            //index_in_group,

            query_instances: IndexMap::default(),
            //query_instances: RwLock::default(),
            //execution_time: AtomicF64::new(-1f64),
            //execution_in_progress: Mutex::new(false),
            executions_completed: 0,
        }
    }
    pub fn get_generation(&self) -> usize {
        self.executions_completed
    }

    /// Call this each cycle, after the batch's contents have been committed to the wider LQGroup. (necessary, since these LQBatch structs are recycled)
    pub fn mark_generation_end_and_reset(&mut self) -> Vec<(String, Arc<LQInstance>)> {
        self.executions_completed += 1;
        self.query_instances.drain(..).collect_vec()
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

    pub async fn execute(&mut self, client: &PGClientObject, parent_mtx: Option<&Mtx>)
        //-> Result<Vec<RowData>, Error>
        -> Result<(), Error>
    {
        new_mtx!(mtx, "1:wait for pg-client", parent_mtx);
        //let client = ctx.data::<Client>().unwrap();
        /*let pool = ctx.data::<Pool>().unwrap();
        let client = pool.get().await.unwrap();*/
        //let client = ctx;
        //mtx.current_section_extra_info = Some(format!("@table_name:{} @filters_sql:{}", instance.table_name, filters_sql));

        let query_instance_vals: Vec<&Arc<LQInstance>> = self.query_instances.values().collect();

        mtx.section("1.1:wait for semaphore permit");
        let permit = SEMAPHORE__BATCH_EXECUTION.acquire().await.unwrap();

        mtx.section("2:prepare the combined query");
        let lq_param_protos = self.lq_param_prototypes();
        let (sql_text, params) = prepare_sql_query(&self.table_name, &lq_param_protos, &query_instance_vals, Some(&mtx))?;

        mtx.section("3:execute the combined query");
        let sql_info_str = format!("@sql_text:{sql_text} @params:{params:?}");
        trace!("Executing query-batch. {sql_info_str}");
        let rows = {
            // todo: remove need for this check (this line should never be reached unless the batch has query-instances!)
            if query_instance_vals.len() == 0 {
                error!("Batch had execute() called, despite its `query_instances` field being empty! (this should never happen)");
                vec![]
            } else {
                let params_wrapped: Vec<ToSqlWrapper> = params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
                let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

                let row_stream = client.query_raw(&sql_text, params_as_refs)
                    .await.map_err(|a| to_anyhow_with_extra(a, sql_info_str.clone()))?;
                let rows: Vec<Row> = row_stream.try_collect()
                    .await.map_err(|a| to_anyhow_with_extra(a, sql_info_str.clone()))?;
                rows
            }
        };

        mtx.section("4:collect the rows into groups (while converting rows to row-data structs)");
        let mut lq_results: Vec<Vec<RowData>> = query_instance_vals.iter().map(|_| vec![]).collect();
        for row in rows {
            let lq_index: i64 = row.get("lq_index");
            // convert to RowData structs (the behavior of RowData/JSONValue is simpler/more-standardized than tokio_postgres::Row)
            let columns_to_process = row.columns().len() - lq_param_protos.len();
            //println!("Columns to process:{columns_to_process} @protos_len:{}", lq_param_protos.len());
            let row_data = postgres_row_to_row_data(row, columns_to_process)?;
            //println!("Got row-data!:{:?}", row_data);
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

        // drop semaphore permit (ie. if there's another thread waiting to enter the section of code above, allow them now)
        drop(permit);

        mtx.section("6:commit the new result-sets");
        for (i, lq_results) in lq_results_converted.into_iter().enumerate() {
            let lq_instance = query_instance_vals.get(i).unwrap();
            lq_instance.set_last_entries(lq_results).await;
        }

        //self.execution_time.store(time_since_epoch_ms(), Ordering::Relaxed);

        //Ok(lq_results_converted)
        Ok(())
    }
}

lazy_static! {
    // limit the number of threads that are simultaneously executing lq-batches
    // (this yields a better result, since it means requests will resolve "at full speed, but in order", rather than "at full speed, all at once, such that they all take a long time to complete")
    static ref SEMAPHORE__BATCH_EXECUTION: Semaphore = Semaphore::new(get_batch_execution_concurrency_limit());
}
fn get_batch_execution_concurrency_limit() -> usize {
    let logical_cpus = num_cpus::get();
    match logical_cpus {
        // if device has 3+ cores, leave one core free, for the various other processing that needs to occur
        3.. => logical_cpus - 1,
        _ => logical_cpus,
    }
}