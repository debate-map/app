use std::iter::{once, empty};
use std::sync::atomic::{AtomicU64, Ordering};
use std::{sync::Arc};
use rust_shared::anyhow::{Error};
use rust_shared::async_graphql::{Result};
use deadpool_postgres::Pool;
use futures_util::{StreamExt, TryFutureExt, TryStreamExt};
use rust_shared::indexmap::IndexMap;
use rust_shared::itertools::{chain, Itertools};
use rust_shared::new_mtx;
use rust_shared::tokio::sync::RwLock;
use rust_shared::tokio_postgres::Row;
use rust_shared::utils::general_::extensions::IteratorV;
use rust_shared::utils::mtx::mtx::Mtx;
use crate::store::live_queries_::lq_instance::LQInstance;
use crate::store::live_queries_::lq_param::LQParam;
use crate::utils::db::filter::{QueryFilter};
use crate::utils::db::pg_row_to_json::postgres_row_to_row_data;
use crate::utils::db::sql_fragment::{SF};
use crate::utils::db::sql_ident::SQLIdent;
use crate::utils::db::sql_param::{SQLParam, SQLParamBoxed};
use crate::utils::general::general::{match_cond_to_iter, AtomicF64};
use crate::utils::type_aliases::PGClientObject;
use crate::{utils::{db::{sql_fragment::{SQLFragment}}}};

pub fn prepare_sql_query(table_name: &str, lq_param_protos: &Vec<LQParam>, query_instance_vals: &Vec<&Arc<LQInstance>>, mtx_p: Option<&Mtx>) -> Result<(String, Vec<SQLParamBoxed>), Error> {
    new_mtx!(mtx, "1:prep", mtx_p);
    let lq_last_index = query_instance_vals.len() as i64 - 1;

    // each entry of the root-chain is considered its own line, with `merge_lines()` adding line-breaks between them
    let mut combined_sql = SF::merge_lines(chain!(
        {mtx.section("2"); empty()},
        chain!(
            SF::lit("WITH lq_param_sets(").once(),
            lq_param_protos.iter().enumerate().map(|(i, proto)| -> Result<SQLFragment, Error> {
                Ok(SF::merge(chain!(
                    match_cond_to_iter(i > 0, SF::lit(", ").once(), empty()),
                    Some(SF::ident(SQLIdent::new(proto.name())?)),
                ).collect_vec()))
            }).try_collect2::<Vec<_>>()?,
            SF::lit(") AS (").once()
        ),

        {mtx.section("3"); empty()},
        SF::lit("VALUES").once(),
        query_instance_vals.iter().enumerate().map(|(lq_index, lq_instance)| -> Result<SQLFragment, Error> {
            let lq_param_instances = lq_param_protos.iter().map(|proto| -> Result<LQParam, Error> {
                proto.instantiate_param_using_lq_instance_data(lq_index, lq_instance)
            }).try_collect2::<Vec<_>>()?;

            Ok(SF::merge(chain!(
                SF::lit("(").once(),
                lq_param_instances.iter().enumerate().map(|(lq_param_i, lq_param)| -> Result<SQLFragment, Error> {
                    Ok(SF::merge(chain!(
                        match_cond_to_iter(lq_param_i > 0, SF::lit(", ").once(), empty()),
                        once(lq_param.get_sql_for_value()?),
                    ).collect_vec()))
                }).try_collect2::<Vec<_>>()?,
                SF::lit(")").once(),
                match_cond_to_iter((lq_index as i64) < lq_last_index, SF::lit(",").once(), empty()),
            ).collect_vec()))
        }).try_collect2::<Vec<_>>()?,
        SF::lit(")").once(),
        SF::new("SELECT * FROM $I", vec![SQLIdent::new_boxed(table_name.to_owned())?]).once(),
        SF::lit("JOIN lq_param_sets ON (").once(),

        {mtx.section("4"); empty()},
        match_cond_to_iter(
            // if the only lq-param is the "lq_index" one, then use an always-true expression for the "JOIN ON" section
            lq_param_protos.len() <= 1,
            SF::lit("'1' = '1'").once(),
            lq_param_protos.iter()
                // in this section, we only care about the FilterOpValue lq-params
                .filter(|proto| {
                    match proto {
                        LQParam::FilterOpValue(..) => true,
                        LQParam::LQIndex(..) => false,
                    }
                })
                .enumerate()
                .map(|(i, proto)| -> Result<SQLFragment, Error> {
                    Ok(SF::merge(chain!(
                        match_cond_to_iter(i > 0, SF::lit("AND ").once(), empty()),
                        once(proto.get_sql_for_application(table_name, "lq_param_sets")?),
                    ).collect_vec()))
                }).try_collect2::<Vec<_>>()?.into_iter(),
            ),
        SF::lit(") ORDER BY lq_index;").once(),
    ).collect_vec());
    Ok(combined_sql.into_query_args()?)
}

#[cfg(test)]
mod tests {
    use std::{sync::Arc, iter::once};

    use rust_shared::itertools::chain;
    use rust_shared::utils::general_::extensions::ToOwnedV;
    use rust_shared::{utils::time::time_since_epoch_ms, utils::type_aliases::JSONValue};
    use rust_shared::serde_json::json;
    use crate::store::live_queries_::lq_instance::LQInstance;
    use crate::store::live_queries_::lq_key::LQKey;
    use crate::store::live_queries_::lq_param::LQParam;
    use crate::utils::db::filter::{FilterOp, QueryFilter};

    use super::prepare_sql_query;

    // run in PowerShell using: `cargo test sql_generator_simple -- --nocapture`
    #[test]
    fn sql_generator_simple() {
        //match std::panic::catch_unwind(|| {
        let table_name = "maps";
        let lq_param_protos = vec![
            LQParam::LQIndex(0),
            LQParam::FilterOpValue("id".to_owned(), 0, FilterOp::EqualsX(JSONValue::String("GLOBAL_ROOT_0000000001".to_owned()))),
        ];
        let filter_input = json!({
            "id": {
                "equalTo": "GLOBAL_ROOT_0000000001"
            }
        });
        let filter = QueryFilter::from_filter_input(&filter_input).unwrap();
        let lq_key = LQKey::new(table_name.o(), filter.o());
        let instance1 = Arc::new(LQInstance::new(lq_key, vec![]));
        let query_instance_vals: Vec<&Arc<LQInstance>> = vec![
            &instance1
        ];

        let start_time = time_since_epoch_ms();
        let mut last_print_time = start_time;
        for i in 0..1_000_000_000 {
        //for i in 0..10 {
            let now = time_since_epoch_ms();
            if now - last_print_time >= 1000f64 {
                let ms_since_start = now - start_time;
                let seconds_since_start = ms_since_start / 1000f64;
                let loops_per_second = (f64::from(i) + 1f64) / seconds_since_start;
                let loop_time = ms_since_start / (f64::from(i) + 1f64);
                println!("loopTime:{:.3}ms loopsPerSecond:{:.1} @timeSinceStart:{:.1}", loop_time, loops_per_second, seconds_since_start);
                last_print_time = now;
            }
            //println!("Starting loop:{i}");
            prepare_sql_query(table_name, &lq_param_protos, &query_instance_vals, None).unwrap();
        }
        /*}) {
            Ok(_) => println!("Done!"),
            Err(err) => println!("Got error:{err:?}")
        };*/
    }
}