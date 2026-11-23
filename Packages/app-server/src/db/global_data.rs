use futures_util::{stream, Stream, TryFutureExt};
use graphlink_rust::{handle_generic_gql_collection_query, handle_generic_gql_doc_query, FilterInput, GQLError, SubError};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json;
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::utils::type_aliases::JSONValue;

use crate::gql_set_impl;
use crate::utils::db::generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet};

wrap_slow_macros! {

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct GlobalData {
	pub id: ID,
	pub extras: JSONValue,
}
gql_set_impl!(GlobalData);

#[derive(Default)] pub struct QueryShard_GlobalData;
#[Object] impl QueryShard_GlobalData {
	async fn globalData(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<GlobalData>, GQLError> {
		handle_generic_gql_collection_query(ctx, "globalData", filter).await
	}
	async fn globalDatum(&self, ctx: &Context<'_>, id: String) -> Result<Option<GlobalData>, GQLError> {
		handle_generic_gql_doc_query(ctx, "globalData", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_GlobalData;
#[Subscription] impl SubscriptionShard_GlobalData {
	async fn globalData<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>, cached_entry_hashes: Option<std::collections::HashMap<String, String>>) -> impl Stream<Item = Result<GQLSet_GlobalData, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<GlobalData, GQLSet_GlobalData>(ctx, "globalData", filter, cached_entry_hashes, None).await
	}
	async fn globalDatum<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<GlobalData>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<GlobalData>(ctx, "globalData", id).await
	}
}

}
