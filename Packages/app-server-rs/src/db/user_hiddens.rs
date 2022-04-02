use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::Filter}};

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct UserHidden {
    pub id: ID,
    pub email: String,
    pub providerData: serde_json::Value,
    pub backgroundID: Option<String>,
    #[graphql(name = "backgroundCustom_enabled")]
    pub backgroundCustom_enabled: Option<bool>,
    #[graphql(name = "backgroundCustom_color")]
    pub backgroundCustom_color: Option<String>,
    #[graphql(name = "backgroundCustom_url")]
    pub backgroundCustom_url: Option<String>,
    #[graphql(name = "backgroundCustom_position")]
    pub backgroundCustom_position: Option<String>,
    pub addToStream: bool,
    pub lastAccessPolicy: Option<String>,
    pub extras: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for UserHidden {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            email: row.get("email"),
            providerData: serde_json::from_value(row.get("providerData")).unwrap(),
            backgroundID: row.get("backgroundID"),
            backgroundCustom_enabled: row.get("backgroundCustom_enabled"),
            backgroundCustom_color: row.get("backgroundCustom_color"),
            backgroundCustom_url: row.get("backgroundCustom_url"),
            backgroundCustom_position: row.get("backgroundCustom_position"),
            addToStream: row.get("addToStream"),
            lastAccessPolicy: row.get("lastAccessPolicy"),
            extras: serde_json::from_value(row.get("extras")).unwrap(),
		}
	}
}

/*#[derive(Default)]
pub struct MutationShard_UserHidden;
#[Object]
impl MutationShard_UserHidden {
    async fn empty(&self) -> &str { &"" }
}*/

#[derive(Clone)] pub struct GQLSet_UserHidden { nodes: Vec<UserHidden> }
#[Object] impl GQLSet_UserHidden { async fn nodes(&self) -> &Vec<UserHidden> { &self.nodes } }
impl GQLSet<UserHidden> for GQLSet_UserHidden {
    fn from(entries: Vec<UserHidden>) -> GQLSet_UserHidden { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<UserHidden> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_UserHidden;
#[Subscription]
impl SubscriptionShard_UserHidden {
    async fn userHiddens<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Filter) -> impl Stream<Item = GQLSet_UserHidden> + 'a {
        handle_generic_gql_collection_request::<UserHidden, GQLSet_UserHidden>(ctx, "userHiddens", filter).await
    }
    async fn userHidden<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Option<UserHidden>> + 'a {
        handle_generic_gql_doc_request::<UserHidden>(ctx, "userHiddens", id).await
    }
}

}