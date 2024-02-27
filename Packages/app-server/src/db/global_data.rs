use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json, GQLError};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use rust_shared::serde;
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};

use crate::utils::db::generic_handlers::queries::{handle_generic_gql_doc_query, handle_generic_gql_collection_query};
use crate::utils::{db::{generic_handlers::{subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet}}, filter::FilterInput}};

wrap_slow_macros!{

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
impl From<Row> for GlobalData {
	fn from(row: Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            extras: serde_json::from_value(row.get("extras")).unwrap(),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_GlobalData { pub nodes: Vec<GlobalData> }
#[Object] impl GQLSet_GlobalData { async fn nodes(&self) -> &Vec<GlobalData> { &self.nodes } }
impl GQLSet<GlobalData> for GQLSet_GlobalData {
    fn from(entries: Vec<GlobalData>) -> GQLSet_GlobalData { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<GlobalData> { &self.nodes }
}

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
    async fn globalData<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_GlobalData, SubError>> + 'a {
        handle_generic_gql_collection_subscription::<GlobalData, GQLSet_GlobalData>(ctx, "globalData", filter).await
    }
    async fn globalDatum<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<GlobalData>, SubError>> + 'a {
        handle_generic_gql_doc_subscription::<GlobalData>(ctx, "globalData", id).await
    }
}

}