use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};

#[derive(SimpleObject, Clone)]
pub struct MapNode {
    id: ID,
	creator: String,
	createdAt: i64,
    r#type: String,
	rootNodeForMap: Option<String>,
    #[graphql(name = "c_currentRevision")]
	c_currentRevision: Option<String>,
	accessPolicy: String,
	multiPremiseArgument: Option<bool>,
	argumentType: Option<String>,
	extras: serde_json::Value,
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
    async fn nodes<'a>(&self, ctx: &'a Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_MapNode> + 'a {
        handle_generic_gql_collection_request::<MapNode, GQLSet_MapNode>(ctx, "nodes", filter).await
    }
    async fn node<'a>(&self, ctx: &'a Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<MapNode>> + 'a {
        handle_generic_gql_doc_request::<MapNode, GQLSet_MapNode>(ctx, "nodes", &id).await
    }
}