use super::{accessors::AccessorContext, filter::QueryFilter};
use crate::flume::Sender;
use crate::serde::{de::DeserializeOwned, Deserialize, Serialize};
use crate::serde_json::{json, Map};
use crate::tokio_postgres::{types::ToSql, Client, Row, Statement};
use crate::tracing::{debug, info, trace};
use crate::utils::general::extensions::IteratorV;
use crate::utils::mtx::mtx::new_mtx;
use crate::uuid::Uuid;
use crate::{
	anyhow::{bail, Context, Error},
	async_graphql, serde_json,
	utils::mtx::mtx::Mtx,
};
use crate::{
	async_graphql::{
		async_stream::{self, stream},
		parser::types::Field,
		Object, OutputType, Positioned, Result,
	},
	utils::general::extensions::ToOwnedV,
};
use crate::{get_app_state_from_gql_ctx, DropLQWatcherMsg, LQStorage, LQStorageArc, SQLFragment, SQLIdent, ToSqlWrapper};
use crate::{postgres_row_to_entry_blob, postgres_row_to_entry_row, to_anyhow, EntryBlob, EntryJSON};
use deadpool_postgres::{Pool, Transaction};
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt, TryStreamExt};
use std::{
	any::TypeId,
	cell::RefCell,
	pin::Pin,
	task::{Poll, Waker},
	time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

/// Helper to make it easier to provide inline sql-params of different types.
pub fn params<'a>(parameters: &'a [&'a (dyn ToSql + Sync)]) -> Vec<&'a (dyn ToSql + Sync)> {
	parameters.iter().map(|x| *x as &(dyn ToSql + Sync)).collect()
}

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

//pub type QueryFunc = FnOnce(String/*, &'a [&(dyn ToSql + Sync)]*/) -> QueryFuncReturn;
/*pub type QueryFunc = dyn FnOnce(SQLFragment) -> QueryFuncReturn;
pub type QueryFuncReturn = dyn Future<Output = Result<Vec<Row>, tokio_postgres::Error>>;*/

pub async fn get_entries_in_collection_base<QueryFunc, QueryFuncReturn>(query_func: QueryFunc, table_name: String, filter: &QueryFilter, parent_mtx: Option<&Mtx>) -> Result<(Vec<EntryBlob>, Vec<EntryJSON>), Error>
where
	QueryFunc: FnOnce(SQLFragment) -> QueryFuncReturn,
	QueryFuncReturn: Future<Output = Result<Vec<Row>, Error>>,
{
	new_mtx!(mtx, "1:run query", parent_mtx);
	//let filters_sql = get_sql_for_query_filter(filter, None, None).with_context(|| format!("Got error while getting sql for filter:{filter:?}"))?;
	let filters_sql = filter.get_sql_for_application().with_context(|| format!("Got error while getting sql for filter:{filter:?}"))?;
	let filters_sql_str = filters_sql.to_string(); // workaround for difficulty implementing Clone for SQLFragment ()
	mtx.current_section.extra_info = Some(format!("@table_name:{table_name} @filters_sql:{filters_sql}"));

	let where_sql = match filters_sql.sql_text.len() {
		0..=2 => SQLFragment::lit(""),
		_ => SQLFragment::merge(vec![SQLFragment::lit(" WHERE "), filters_sql]),
	};

	info!("Running where clause. @table:{table_name} @where:{where_sql} @filter:{filter:?}");
	let final_query = SQLFragment::merge(vec![SQLFragment::new("SELECT * FROM $I", vec![Box::new(SQLIdent::new(table_name.clone())?)]), where_sql]);

	let mut rows = query_func(final_query).await.with_context(|| format!("Error running select command for entries in table. @table:{table_name} @filters_sql:{filters_sql_str}"))?;

	mtx.section("2:sort and convert");
	// sort by id, so that order of our results here is consistent with order after live-query-updating modifications (see live_queries.rs)
	rows.sort_by_key(|a| a.get::<&str, String>(&"id".o())); // &"...".o() is temp-fix for rust-analyzer bug

	let entry_blobs: Vec<EntryBlob> = rows.into_iter().map(|a| postgres_row_to_entry_blob(a, None)).try_collect2()?;
	let entry_jsons: Vec<EntryJSON> = entry_blobs.iter().map(|a| a.clone().up(&table_name)).try_collect2()?;

	Ok((entry_blobs, entry_jsons))
}
pub async fn get_entries_in_collection(ctx: &AccessorContext<'_>, table_name: String, filter: &QueryFilter, parent_mtx: Option<&Mtx>) -> Result<(Vec<EntryBlob>, Vec<EntryJSON>), Error> {
	/*new_mtx!(mtx, "1:wait for pg-client", parent_mtx);
	let pool = &get_app_state_from_gql_ctx(ctx).db_pool;
	let client = pool.get().await.unwrap();*/

	//mtx.section("2:get entries");
	new_mtx!(mtx, "1:get entries", parent_mtx);
	let query_func = |mut sql: SQLFragment| async move {
		let (sql_text, params) = sql.into_query_args()?;
		info!("Running sql fragment. @sql_text:{sql_text} @params:{params:?}");

		/*let temp1: Vec<Box<dyn ToSql + Sync>> = params.into_iter().map(strip_send_from_tosql_sync_send).collect();
		let temp2: Vec<&(dyn ToSql + Sync)> = temp1.iter().map(|a| a.as_ref()).collect();
		client.query(&sql_text, temp2.as_slice()).await*/

		let params_wrapped: Vec<ToSqlWrapper> = params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
		let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

		ctx.tx.query_raw(&sql_text, params_as_refs).await.map_err(to_anyhow)?.try_collect().await.map_err(to_anyhow)
	};
	let (entry_blobs, entry_jsons) = get_entries_in_collection_base(query_func, table_name, filter, Some(&mtx)).await?;
	Ok((entry_blobs, entry_jsons))
}
