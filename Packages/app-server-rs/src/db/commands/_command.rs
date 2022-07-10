// work-in-progress; once the new Command system is worked out here in Rust, I'll start migrating the Command classes from app-server-js into it

use std::iter::{once, empty};

use itertools::{chain, Itertools};
use serde::Serialize;
use async_trait::async_trait;
use futures_util::{TryStreamExt};
use serde_json::json;
use tokio_postgres::Row;
use anyhow::{anyhow, Error, Context};
use deadpool_postgres::{Transaction, Pool};

use crate::utils::{db::{sql_fragment::{SQLFragment, SF}, filter::{FilterInput, QueryFilter}, queries::get_entries_in_collection_basic, pg_stream_parsing::RowData, sql_param::{SQLIdent, json_value_to_sql_value_param}, accessors::AccessorContext}, general::{general::{to_anyhow, match_cond_to_iter}, data_anchor::{DataAnchor, DataAnchorFor1}, extensions::IteratorV}, type_aliases::PGClientObject};
use crate::{utils::type_aliases::JSONValue};

pub struct UserInfo {
    pub id: String,
}

#[async_trait(?Send)]
pub trait Command {
    async fn Validate(&self, ctx: &AccessorContext<'_>) -> Result<JSONValue, Error>;
    fn Commit(&self, ctx: &AccessorContext<'_>) -> Result<(), Error>;
}

// command helpers
// ==========

//pub fn db_set<T: AsRef<str>, T2: Serialize>(ctx: &AccessorContext<'_>, path: &[T], value: T2) {}

/*pub async fn set_db_entry_by_id(ctx: &AccessorContext<'_>, table_name: String, id: String, new_row: RowData) -> Result<Vec<Row>, Error> {
    set_db_entry_by_filter(ctx, table_name, json!({
        "id": {"equalTo": id}
    }), new_row).await
}
pub async fn set_db_entry_by_filter(ctx: &AccessorContext<'_>, table_name: String, filter_json: FilterInput, new_row: RowData) -> Result<Vec<Row>, Error> {
    let filter = QueryFilter::from_filter_input_opt(&Some(filter_json))?;
    let filters_sql = filter.get_sql_for_application().with_context(|| format!("Got error while getting sql for filter:{filter:?}"))?;
    //let filters_sql_str = filters_sql.to_string(); // workaround for difficulty implementing Clone for SQLFragment ()
    let where_sql = SF::merge(vec![
        SF::lit(" WHERE "),
        filters_sql
    ]);
    [...]
}*/

pub async fn set_db_entry_by_id(ctx: &AccessorContext<'_>, table_name: String, id: String, new_row: RowData) -> Result<Vec<Row>, Error> {
    let mut final_query = SF::merge_lines(chain!(
        chain!(
            SF::new_once("INSERT INTO $I (", vec![SQLIdent::param(table_name.clone())?]),
            new_row.iter().enumerate().map(|(i, key_and_val)| -> Result<SQLFragment, Error> {
                Ok(SF::merge(chain!(
                    match_cond_to_iter(i > 0, once(SF::lit(", ")), empty()),
                    Some(SQLIdent::param(key_and_val.0.to_owned())?.into_ident_fragment()?),
                ).collect_vec()))
            }).try_collect2::<Vec<_>>()?,
            SF::lit_once(")")
        ),
        chain!(
            SF::lit_once("VALUES("),
            new_row.iter().enumerate().map(|(i, key_and_val)| -> Result<SQLFragment, Error> {
                Ok(SF::merge(chain!(
                    match_cond_to_iter(i > 0, once(SF::lit(", ")), empty()),
                    Some(json_value_to_sql_value_param(&key_and_val.1.to_owned())?.into_value_fragment()?),
                ).collect_vec()))
            }).try_collect2::<Vec<_>>()?,
            SF::lit_once(")"),
        ),
        SF::lit_once("ON CONFLICT (id) DO UPDATE"),
    ).collect_vec());
    let (sql_text, params) = final_query.into_query_args()?;

    let rows: Vec<Row> = ctx.tx.query_raw(&sql_text, params).await.map_err(to_anyhow)?
        .try_collect().await.map_err(to_anyhow)?;
    Ok(rows)
}