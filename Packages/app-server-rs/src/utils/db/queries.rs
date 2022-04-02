use std::{any::TypeId, pin::Pin, task::{Poll, Waker}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}, cell::RefCell};
use anyhow::{bail, Context, Error};
use async_graphql::{Result, async_stream::{stream, self}, OutputType, Object, Positioned, parser::types::Field};
use deadpool_postgres::Pool;
use flume::Sender;
use futures_util::{Stream, StreamExt, Future, stream, TryFutureExt};
use hyper::Body;
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use serde_json::{json, Map};
use tokio_postgres::{Client, Row, types::ToSql};
use uuid::Uuid;
use metrics::{counter, histogram, increment_counter};

use crate::{store::live_queries::{LQStorageWrapper, LQStorage, get_lq_key, DropLQWatcherMsg, RowData}, utils::{type_aliases::JSONValue, db::filter::get_sql_for_filters,}};
use super::{super::{mtx::mtx::{new_mtx, Mtx}}, filter::Filter};

/*type QueryFunc_ResultType = Result<Vec<Row>, tokio_postgres::Error>;
type QueryFunc = Box<
    dyn Fn(&str, &[&(dyn ToSql + Sync)])
    ->
    Pin<Box<
        dyn Future<Output = QueryFunc_ResultType>
    >>
>;
fn force_boxed<T>(f: fn(&str, &[&(dyn ToSql + Sync)]) -> T) -> QueryFunc
where
    T: Future<Output = QueryFunc_ResultType> + 'static,
{
    Box::new(move |a, b| Box::pin(f(a, b)))
}*/

pub async fn get_entries_in_collection_basic</*'a,*/ T: From<Row> + Serialize, QueryFunc, QueryFuncReturn>(
    query_func: QueryFunc, table_name: &str, filter: &Filter, parent_mtx: Option<&Mtx>,
) -> Result<(Vec<RowData>, Vec<T>), Error>
where
    QueryFunc: FnOnce(String/*, &'a [&(dyn ToSql + Sync)]*/) -> QueryFuncReturn,
    QueryFuncReturn: Future<Output = Result<Vec<Row>, tokio_postgres::Error>>,
{
    new_mtx!(mtx, "1:run query", parent_mtx);
    let filters_sql = get_sql_for_filters(filter).with_context(|| format!("Got error while getting sql for filter:{filter:?}"))?;
    mtx.current_section_extra_info = Some(format!("@table_name:{table_name} @filters_sql:{filters_sql}"));
    let where_clause = match filters_sql.len() {
        0..=2 => "".to_owned(),
        _ => " WHERE ".to_owned() + &filters_sql,
    };
    println!("Running where clause. @table:{table_name} @{where_clause} @filter:{filter:?}");
    let mut rows = query_func(format!("SELECT * FROM \"{table_name}\"{where_clause};")/*, &[]*/).await
        .with_context(|| format!("Error running select command for entries in table. @table:{table_name} @filters_sql:{filters_sql}"))?;

    mtx.section("2:sort and convert");
    // sort by id, so that order of our results here is consistent with order after live-query-updating modifications (see storage.rs)
    rows.sort_by_key(|a| a.get::<&str, String>("id"));

    //let entries: Vec<JSONValue> = rows.into_iter().map(|r| r.into()).collect();
    let entries_as_type: Vec<T> = rows.into_iter().map(|r| r.into()).collect();
    //let entries: Vec<JSONValue> = entries_as_type.iter().map(|r| serde_json::to_value(r).unwrap()).collect();
    let entries: Vec<RowData> = entries_as_type.iter().map(|r| {
        let json_val = serde_json::to_value(r).unwrap();
        json_val.as_object().unwrap().clone()
    }).collect();

    Ok((entries, entries_as_type))
}
pub async fn get_entries_in_collection</*'a,*/ T: From<Row> + Serialize>(ctx: &async_graphql::Context<'_>, table_name: &str, filter: &Filter, parent_mtx: Option<&Mtx>) -> Result<(Vec<RowData>, Vec<T>), Error> {
    new_mtx!(mtx, "1:wait for pg-client", parent_mtx);
    //let client = ctx.data::<Client>().unwrap();
    let pool = ctx.data::<Pool>().unwrap();
    let client = pool.get().await.unwrap();

    mtx.section("2:get entries");
    let query_func = |str1: String| async move {
        client.query(&str1, &[]).await
    };
    let (entries, entries_as_type) = get_entries_in_collection_basic(query_func, table_name, filter, Some(&mtx)).await.unwrap();
    Ok((entries, entries_as_type))
}