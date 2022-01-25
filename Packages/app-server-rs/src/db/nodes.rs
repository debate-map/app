use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, apply_gql_filter};

#[derive(SimpleObject)]
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

pub struct GQLSet_MapNode<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_MapNode<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_MapNode;
#[Subscription]
impl SubscriptionShard_MapNode {
    async fn nodes(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_MapNode<MapNode>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"nodes\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"nodes\";", &[]).await.unwrap(),
        };
        let entries: Vec<MapNode> = apply_gql_filter(&filter, rows.into_iter().map(|r| r.into()).collect());

        stream::once(async {
            GQLSet_MapNode {
                nodes: entries, 
            }
        })
    }
    async fn node(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<MapNode>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.nodes(ctx, Some(id), filter)).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}