use rust_shared::SubError;
use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MapNode {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub r#type: String,
	pub rootNodeForMap: Option<String>,
    #[graphql(name = "c_currentRevision")]
	//pub c_currentRevision: Option<String>,
	pub c_currentRevision: String,
	pub accessPolicy: String,
	pub multiPremiseArgument: Option<bool>,
	pub argumentType: Option<String>,
	pub extras: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for MapNode {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            r#type: row.get("type"),
            rootNodeForMap: row.get("rootNodeForMap"),
            c_currentRevision: row.get("c_currentRevision"),
            accessPolicy: row.get("accessPolicy"),
            multiPremiseArgument: row.get("multiPremiseArgument"),
            argumentType: row.get("argumentType"),
            extras: row.get("extras"),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_MapNode { nodes: Vec<MapNode> }
#[Object] impl GQLSet_MapNode { async fn nodes(&self) -> &Vec<MapNode> { &self.nodes } }
impl GQLSet<MapNode> for GQLSet_MapNode {
    fn from(entries: Vec<MapNode>) -> GQLSet_MapNode { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<MapNode> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_MapNode;
#[Subscription]
impl SubscriptionShard_MapNode {
    async fn nodes<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_MapNode, SubError>> + 'a {
        handle_generic_gql_collection_request::<MapNode, GQLSet_MapNode>(ctx, "nodes", filter).await
    }
    async fn node<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Result<Option<MapNode>, SubError>> + 'a {
        handle_generic_gql_doc_request::<MapNode>(ctx, "nodes", id).await
    }
}

}