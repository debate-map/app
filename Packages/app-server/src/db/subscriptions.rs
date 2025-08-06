use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::async_graphql::async_stream::{self, stream};
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, to_sub_err, to_sub_err_in_stream};
use rust_shared::{serde_json, GQLError, SubError};
use tracing::info;

use crate::gql_set_impl;
use crate::utils::db::accessors::{get_db_entry, AccessorContext};
use crate::utils::db::filter::{FilterOp, QueryFilter};
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query, handle_generic_gql_paginated_query};
use crate::utils::db::generic_handlers::subscriptions::GQLSubOpts;
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::{
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

use super::_general::{QueryPaginationFilter, QueryPaginationResult};
use super::commands::_command::{CanNullOrOmit, CanOmit};

pub async fn get_subscription(ctx: &AccessorContext<'_>, id: &str) -> Result<Subscription, Error> {
	get_db_entry(
		ctx,
		"subscriptions",
		&Some(json!({
			"id": {"equalTo": id}
		})),
	)
	.await
}

wrap_slow_macros! {

#[derive(SimpleObject, Clone, Serialize, Deserialize, Debug)]
pub struct Subscription {
	pub id: ID,
	pub user: String,
	pub node: String,
	pub addChildNode: bool,
	pub deleteNode: bool,
	pub addNodeLink: bool,
	pub deleteNodeLink: bool,
	pub addNodeRevision: bool,
	pub setNodeRating: bool,
	pub createdAt: i64,
	pub updatedAt: i64,
}
impl From<Row> for Subscription {
	fn from(row: Row) -> Self {
		postgres_row_to_struct(row).unwrap()
	}
}

gql_set_impl!(Subscription);

#[derive(Default)]
pub struct QueryShard_Subscription;
#[Object]
impl QueryShard_Subscription {
	async fn subscriptions(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Subscription>, GQLError> {
		handle_generic_gql_collection_query(ctx, "subscriptions", filter).await
	}
	async fn subscription(&self, ctx: &Context<'_>, id: String) -> Result<Option<Subscription>, GQLError> {
		handle_generic_gql_doc_query(ctx, "subscriptions", id).await
	}
	#[cfg(not(feature = "rust-analyzer"))]
	async fn subscriptions_paginated(&self, ctx: &Context<'_>, limit: i64, after: Option<i64>, order_by: Option<String>, order_desc: Option<bool>, filter: Option<FilterInput>) -> Result<QueryPaginationResult<Subscription>, GQLError> {
		let order_by = match order_by {
			Some(order) if order == "createdAt" => Some("createdAt".to_owned()),
			_ => Some("updatedAt".to_owned()),
		};
		handle_generic_gql_paginated_query(ctx, "subscriptions", QueryPaginationFilter { limit: Some(limit), after, order_by, order_desc }, filter).await
	}
}

#[derive(Default)]
pub struct SubscriptionShard_Subscription;
#[Subscription]
impl SubscriptionShard_Subscription {
	async fn subscriptions<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Subscription, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<Subscription, GQLSet_Subscription>(
			ctx,
			"subscriptions",
			filter,
			Some(GQLSubOpts {
				filter_checker: |filter| {
					if let Some(node_filter) = &filter.field_filters.get("node") {
						for op in &node_filter.filter_ops {
							if let FilterOp::EqualsX(op_value) = op {
								if let JSONValue::String(_node_id) = op_value {
									return Ok(());
								}
							}
						}
					}
					Err("The subscriptions table requires a {node: {equalTo: nodeId}} filter. (for performance reasons)")
				},
			}),
		)
		.await
	}
	async fn subscription<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Subscription>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<Subscription>(ctx, "subscriptions", id).await
	}
}

}
