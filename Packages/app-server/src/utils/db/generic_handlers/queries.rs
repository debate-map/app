use deadpool_postgres::{Pool, Transaction};
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt, TryStreamExt};
use metrics::{counter, histogram};
use rust_shared::flume::{Receiver, Sender};
use rust_shared::serde::{de::DeserializeOwned, Deserialize, Serialize};
use rust_shared::serde_json::{json, Map};
use rust_shared::tokio_postgres::{types::ToSql, Client, Row};
use rust_shared::uuid::Uuid;
use rust_shared::SubError;
use rust_shared::{
	anyhow::{anyhow, bail, Context, Error},
	async_graphql,
	domains::DomainsConstants,
	flume, new_mtx, serde_json, to_sub_err, tokio,
	utils::{auth::jwt_utils_base::UserJWTData, general_::extensions::ToOwnedV, type_aliases::JSONValue},
	GQLError,
};
use rust_shared::{
	async_graphql::{
		async_stream::{self, stream},
		parser::types::Field,
		Object, OutputType, Positioned, Result,
	},
	to_anyhow,
};
use std::{
	any::TypeId,
	cell::RefCell,
	pin::Pin,
	task::{Poll, Waker},
	time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tracing::{error, info};

use super::super::{
	filter::{FilterInput, QueryFilter},
	rls::{
		rls_applier::{self},
		rls_policies::UsesRLS,
	},
};
use crate::db::_general::{QueryPaginationFilter, QueryPaginationResult};
use crate::db::general::subtree_collector::params;
use crate::utils::db::sql_ident::SQLIdent;
use crate::utils::db::sql_param::SQLParamBoxed;
use crate::{
	db::{commands::_command::ToSqlWrapper, general::sign_in_::jwt_utils::try_get_user_jwt_data_from_gql_ctx},
	store::{
		live_queries::{DropLQWatcherMsg, LQStorage, LQStorageArc},
		live_queries_::lq_key::LQKey,
		storage::{get_app_state_from_gql_ctx, AppStateArc},
	},
	utils::{
		db::{accessors::AccessorContext, queries::get_entries_in_collection_base, rls::rls_applier::RLSApplier, sql_fragment::SQLFragment},
		general::data_anchor::DataAnchorFor1,
		type_aliases::PGClientObject,
	},
};

//T: 'static + UsesRLS + From<Row> + Serialize + DeserializeOwned + Send + Clone,
//GQLSetVariant: 'static + GQLSet<T> + Send + Clone + Sync,

pub async fn get_db_entry_base<'a, T: From<Row> + Serialize>(ctx: &AccessorContext<'a>, table_name: &str, filter: &Option<FilterInput>) -> Result<Option<T>, Error> {
	let entries = get_db_entries_base(ctx, table_name, filter).await?;
	let entry = entries.into_iter().nth(0);
	Ok(entry)
}
pub async fn get_db_entries_base<'a, T: From<Row> + Serialize>(ctx: &AccessorContext<'a>, table_name: &str, filter: &Option<FilterInput>) -> Result<Vec<T>, Error> {
	let query_func = |mut sql: SQLFragment| async move {
		let (sql_text, params) = sql.into_query_args()?;
		let debug_info_str = format!("@sqlText:{}\n@params:{:?}", &sql_text, &params);

		let params_wrapped: Vec<ToSqlWrapper> = params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
		let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

		// query_raw supposedly allows dynamically-constructed params-vecs, but the only way I've been able to get it working is by locking the vector to a single concrete type
		// see here: https://github.com/sfackler/rust-postgres/issues/445#issuecomment-1086774095
		//let params: Vec<String> = params.into_iter().map(|a| a.as_ref().to_string()).collect();
		#[rustfmt::skip]
        ctx.tx.query_raw(&sql_text, params_as_refs).await
            .map_err(|err| {
                anyhow!("Got error while running query, for getting db-entries. @error:{}\n{}", err.to_string(), &debug_info_str)
            })?
            .try_collect().await.map_err(|err| {
                anyhow!("Got error while collecting results of db-query, for getting db-entries. @error:{}\n{}", err.to_string(), &debug_info_str)
            })
	};

	let filter = QueryFilter::from_filter_input_opt(filter)?;
	let (_entries, entries_as_type) = get_entries_in_collection_base(query_func, table_name.to_owned(), &filter, None).await?; // pass no mtx, because we don't care about optimizing the "subtree" endpoint atm
	Ok(entries_as_type)
}

pub async fn handle_generic_gql_collection_query<T: From<Row> + Serialize>(gql_ctx: &async_graphql::Context<'_>, table_name: &str, filter: Option<FilterInput>) -> Result<Vec<T>, GQLError> {
	let mut anchor = DataAnchorFor1::empty(); // holds pg-client
	let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
	Ok(get_db_entries_base(&ctx, table_name, &filter).await?)
}
pub async fn handle_generic_gql_doc_query<T: From<Row> + Serialize>(gql_ctx: &async_graphql::Context<'_>, table_name: &str, id: String) -> Result<Option<T>, GQLError> {
	let mut anchor = DataAnchorFor1::empty(); // holds pg-client
	let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
	#[rustfmt::skip]
    Ok(get_db_entry_base(&ctx, table_name, &Some(json!({
        "id": {"equalTo": id}
    }))).await?)
}

pub async fn handle_generic_gql_paginated_query<T: From<Row> + Serialize + OutputType>(gql_ctx: &async_graphql::Context<'_>, table_name: &str, pagination: QueryPaginationFilter, filter: Option<FilterInput>) -> Result<QueryPaginationResult<T>, GQLError> {
	let mut anchor = DataAnchorFor1::empty(); // holds pg-client
	let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;

	let filter = QueryFilter::from_filter_input_opt(&filter)?;

	new_mtx!(mtx, "1:get entries", None);

	let filters_sql = filter.get_sql_for_application().with_context(|| format!("Got error while getting sql for filter:{filter:?}"))?;
	mtx.current_section.extra_info = Some(format!("@table_name:{table_name} @filters_sql:{filters_sql}"));

	let where_sql = match filters_sql.sql_text.len() {
		0..=2 => SQLFragment::lit(""),
		_ => SQLFragment::merge(vec![SQLFragment::lit(" WHERE "), filters_sql]),
	};

	let mut fragments = vec![SQLFragment::new("SELECT * FROM $I", vec![Box::new(SQLIdent::new(table_name.to_string())?)]), where_sql.clone()];
	let count_fragments = vec![SQLFragment::new("SELECT COUNT(*) FROM $I", vec![Box::new(SQLIdent::new(table_name.to_string())?)]), where_sql];

	if let Some(order_by) = pagination.order_by {
		if pagination.order_desc.unwrap_or(false) {
			fragments.push(SQLFragment::new(" ORDER BY $I DESC", vec![Box::new(SQLIdent::new(order_by)?)]));
		} else {
			fragments.push(SQLFragment::new(" ORDER BY $I", vec![Box::new(SQLIdent::new(order_by)?)]));
		}
	}
	if let Some(after) = pagination.after {
		fragments.push(SQLFragment::new(" OFFSET $V ", vec![Box::new(after)]));
	}
	if let Some(limit) = pagination.limit {
		fragments.push(SQLFragment::new(" LIMIT $V ", vec![Box::new(limit)]));
	}

	let mut query: SQLFragment = SQLFragment::merge(fragments);
	let query_str = query.to_string();

	let (sql_text, sql_params) = query.into_query_args()?;
	let debug_info_str = format!("@sqlText:{}\n@params:{:?}", &sql_text, &sql_params);

	let params_wrapped: Vec<ToSqlWrapper> = sql_params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
	let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

	// info!("SQL text for paginated query. @sql_text:{} @params:{:?}", &sql_text, params_as_refs);

	let rows: Vec<Row> = ctx
		.tx
		.query_raw(&sql_text, params_as_refs)
		.map_err(|err| anyhow!("Got error while running query, for getting db-entries. @query: {} \n @error:{}\n{}", query_str, err.to_string(), &debug_info_str))
		.await?
		.try_collect()
		.await
		.map_err(|err| anyhow!("Got error while collecting results of db-query, for getting db-entries. @error:{}\n{}", err.to_string(), &debug_info_str))?;

	let mut count_query: SQLFragment = SQLFragment::merge(count_fragments);
	let (sql_text, sql_params) = count_query.into_query_args()?;
	let debug_info_str = format!("@sqlText:{}\n@params:{:?}", &sql_text, &sql_params);

	let params_wrapped: Vec<ToSqlWrapper> = sql_params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
	let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

	let total_count: Vec<Row> = ctx
		.tx
		.query_raw(&sql_text, params_as_refs)
		.map_err(|err| anyhow!("Got error while running query, for getting db-entries. @query: {} \n @error:{}\n{}", query_str, err.to_string(), &debug_info_str))
		.await?
		.try_collect()
		.await
		.map_err(|err| anyhow!("Got error while collecting results of db-query, for getting db-entries. @error:{}\n{}", err.to_string(), &debug_info_str))?;

	mtx.section("2:convert");

	let entries_as_type: Vec<T> = rows.into_iter().map(|r| r.into()).collect();
	let count: i64 = total_count.get(0).ok_or(anyhow!("No rows"))?.try_get(0)?;

	Ok(QueryPaginationResult { data: entries_as_type, total_count: count })
}

//macro_rules! standard_table_endpoints { ... }
