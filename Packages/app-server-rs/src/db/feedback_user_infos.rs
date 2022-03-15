use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::general::{handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};
use crate::utils::filter::{Filter};

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    id: ID,
    proposalsOrder: Vec<String>,
}
impl From<tokio_postgres::row::Row> for UserInfo {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            proposalsOrder: row.get("proposalsOrder"),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_UserInfo { nodes: Vec<UserInfo> }
#[Object] impl GQLSet_UserInfo { async fn nodes(&self) -> &Vec<UserInfo> { &self.nodes } }
impl GQLSet<UserInfo> for GQLSet_UserInfo {
    fn from(entries: Vec<UserInfo>) -> GQLSet_UserInfo { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<UserInfo> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_UserInfo;
#[Subscription]
impl SubscriptionShard_UserInfo {
    #[graphql(name = "feedback_userInfos")]
    async fn feedback_userInfos<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Filter) -> impl Stream<Item = GQLSet_UserInfo> + 'a {
        handle_generic_gql_collection_request::<UserInfo, GQLSet_UserInfo>(ctx, "feedback_userInfos", filter).await
    }
    #[graphql(name = "feedback_userInfo")]
    async fn feedback_userInfo<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Filter) -> impl Stream<Item = Option<UserInfo>> + 'a {
        handle_generic_gql_doc_request::<UserInfo>(ctx, "feedback_userInfos", id).await
    }
}

}