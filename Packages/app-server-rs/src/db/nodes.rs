use rust_shared::anyhow::Error;
use rust_shared::{SubError, serde_json};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};

pub async fn get_node(ctx: &AccessorContext<'_>, id: &str) -> Result<MapNode, Error> {
    get_db_entry(ctx, "nodes", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
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
impl From<Row> for MapNode {
	fn from(row: Row) -> Self {
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