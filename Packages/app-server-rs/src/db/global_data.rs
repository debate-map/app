use rust_shared::{SubError, serde_json};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use rust_shared::serde;
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct GlobalData {
    pub id: ID,
    pub extras: serde_json::Value,
}
impl From<Row> for GlobalData {
	fn from(row: Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            extras: serde_json::from_value(row.get("extras")).unwrap(),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_GlobalData { nodes: Vec<GlobalData> }
#[Object] impl GQLSet_GlobalData { async fn nodes(&self) -> &Vec<GlobalData> { &self.nodes } }
impl GQLSet<GlobalData> for GQLSet_GlobalData {
    fn from(entries: Vec<GlobalData>) -> GQLSet_GlobalData { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<GlobalData> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_GlobalData;
#[Subscription]
impl SubscriptionShard_GlobalData {
    async fn globalData<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_GlobalData, SubError>> + 'a {
        handle_generic_gql_collection_request::<GlobalData, GQLSet_GlobalData>(ctx, "globalData", filter).await
    }
    async fn globalDatum<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<GlobalData>, SubError>> + 'a {
        handle_generic_gql_doc_request::<GlobalData>(ctx, "globalData", id).await
    }
}

}