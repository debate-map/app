use deadpool_postgres::{Pool, Transaction};
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt, TryStreamExt};
use metrics::{counter, histogram};
use rust_shared::async_graphql::{
	async_stream::{self, stream},
	parser::types::Field,
	Object, OutputType, Positioned, Result,
};
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

		info!("Final query: {}", &sql_text);

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

pub async fn handle_generic_gql_paginated_query<T: From<Row> + Serialize>(gql_ctx: &async_graphql::Context<'_>, table_name: &str, filter: Option<FilterInput>) -> Result<Vec<T>, GQLError> {}

//macro_rules! standard_table_endpoints { ... }
