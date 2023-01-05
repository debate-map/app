use rust_shared::SubError;
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

wrap_slow_macros!{

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

#[derive(Default)]
pub struct SubscriptionShard_UserInfo;
#[Subscription]
impl SubscriptionShard_UserInfo {
    #[graphql(name = "feedback_userInfos")]
    async fn feedback_userInfos<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_UserInfo, SubError>> + 'a {
        handle_generic_gql_collection_request::<UserInfo, GQLSet_UserInfo>(ctx, "feedback_userInfos", filter).await
    }
    #[graphql(name = "feedback_userInfo")]
    async fn feedback_userInfo<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<UserInfo>, SubError>> + 'a {
        handle_generic_gql_doc_request::<UserInfo>(ctx, "feedback_userInfos", id).await
    }
}

}