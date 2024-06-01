use deadpool_postgres::{Pool, Transaction};
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt, TryStreamExt};
use metrics::{counter, histogram};
use rust_shared::async_graphql::{
	async_stream::{self, stream},
	parser::types::Field,
	Object, OutputType, Positioned, Result,
};
use rust_shared::flume::Sender;
use rust_shared::serde::{de::DeserializeOwned, Deserialize, Serialize};
use rust_shared::serde_json::{json, Map};
use rust_shared::tokio_postgres::{types::ToSql, Client, Row, Statement};
use rust_shared::uuid::Uuid;
use rust_shared::{
	anyhow::{bail, Context, Error},
	async_graphql, new_mtx, serde_json, to_anyhow,
	utils::{mtx::mtx::Mtx, type_aliases::RowData},
};
use std::{
	any::TypeId,
	cell::RefCell,
	pin::Pin,
	task::{Poll, Waker},
	time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tracing::{debug, info, trace};

use super::{accessors::AccessorContext, filter::QueryFilter};
use crate::{
	db::commands::_command::ToSqlWrapper,
	store::{
		live_queries::{DropLQWatcherMsg, LQStorage, LQStorageArc},
		storage::get_app_state_from_gql_ctx,
	},
	utils::{
		db::{sql_fragment::SQLFragment, sql_ident::SQLIdent},
		type_aliases::PGClientObject,
	},
};

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

pub async fn get_entries_in_collection_base</*'a,*/ T: From<Row> + Serialize, QueryFunc, QueryFuncReturn>(query_func: QueryFunc, table_name: String, filter: &QueryFilter, parent_mtx: Option<&Mtx>) -> Result<(Vec<RowData>, Vec<T>), Error>
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
	rows.sort_by_key(|a| a.get::<&str, String>("id"));

	let entries_as_type: Vec<T> = rows.into_iter().map(|r| r.into()).collect();
	let entries: Vec<RowData> = entries_as_type
		.iter()
		.map(|r| {
			let json_val = serde_json::to_value(r).unwrap();
			json_val.as_object().unwrap().clone()
		})
		.collect();

	Ok((entries, entries_as_type))
}
pub async fn get_entries_in_collection</*'a,*/ T: From<Row> + Serialize>(ctx: &AccessorContext<'_>, table_name: String, filter: &QueryFilter, parent_mtx: Option<&Mtx>) -> Result<(Vec<RowData>, Vec<T>), Error> {
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
	let (entries, entries_as_type) = get_entries_in_collection_base(query_func, table_name, filter, Some(&mtx)).await?;
	Ok((entries, entries_as_type))
}
