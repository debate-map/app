use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::{GQLError, SubError};

use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::{
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

wrap_slow_macros! {

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct UserInfo {
	pub id: ID,
	pub proposalsOrder: Vec<String>,
}
impl From<Row> for UserInfo {
	fn from(row: Row) -> Self {
		Self {
			id: ID::from(&row.get::<_, String>("id")),
			proposalsOrder: row.get("proposalsOrder"),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_UserInfo { pub nodes: Vec<UserInfo> }
#[Object] impl GQLSet_UserInfo { async fn nodes(&self) -> &Vec<UserInfo> { &self.nodes } }
impl GQLSet<UserInfo> for GQLSet_UserInfo {
	fn from(entries: Vec<UserInfo>) -> GQLSet_UserInfo { Self { nodes: entries } }
	fn nodes(&self) -> &Vec<UserInfo> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_UserInfo;
#[Object] impl QueryShard_UserInfo {
	async fn userInfos(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<UserInfo>, GQLError> {
		handle_generic_gql_collection_query(ctx, "feedback_userInfos", filter).await
	}
	async fn userInfo(&self, ctx: &Context<'_>, id: String) -> Result<Option<UserInfo>, GQLError> {
		handle_generic_gql_doc_query(ctx, "feedback_userInfos", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_UserInfo;
#[Subscription] impl SubscriptionShard_UserInfo {
	#[graphql(name = "feedback_userInfos")]
	async fn feedback_userInfos<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_UserInfo, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<UserInfo, GQLSet_UserInfo>(ctx, "feedback_userInfos", filter, None).await
	}
	#[graphql(name = "feedback_userInfo")]
	async fn feedback_userInfo<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<UserInfo>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<UserInfo>(ctx, "feedback_userInfos", id).await
	}
}

}
