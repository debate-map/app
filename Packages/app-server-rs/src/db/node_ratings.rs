use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, apply_gql_filter};

#[derive(SimpleObject)]
pub struct NodeRating {
    id: ID,
    accessPolicy: String,
    node: String,
    r#type: String,
	creator: String,
	createdAt: i64,
	value: f64,
}
impl From<tokio_postgres::row::Row> for NodeRating {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            accessPolicy: row.get("accessPolicy"),
            node: row.get("node"),
            r#type: row.get("type"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            value: row.get("value"),
		}
	}
}

pub struct GQLSet_NodeRating<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_NodeRating<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_NodeRating;
#[Subscription]
impl SubscriptionShard_NodeRating {
    async fn nodeRatings(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_NodeRating<NodeRating>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"nodeRatings\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"nodeRatings\";", &[]).await.unwrap(),
        };
        let entries: Vec<NodeRating> = apply_gql_filter(&filter, rows.into_iter().map(|r| r.into()).collect());

        stream::once(async {
            GQLSet_NodeRating {
                nodes: entries, 
            }
        })
    }
    async fn nodeRating(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<NodeRating>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.nodeRatings(ctx, Some(id), filter)).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}