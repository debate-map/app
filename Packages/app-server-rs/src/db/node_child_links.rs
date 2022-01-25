use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, apply_gql_filter};

#[derive(SimpleObject)]
pub struct NodeChildLink {
    id: ID,
	creator: String,
	createdAt: i64,
	parent: String,
	child: String,
	group: String,
	slot: i32,
	form: Option<String>,
	seriesAnchor: Option<bool>,
	seriesEnd: Option<bool>,
	polarity: Option<String>,
    #[graphql(name = "c_parentType")]
	c_parentType: Option<String>,
    #[graphql(name = "c_childType")]
	c_childType: Option<String>,
}
impl From<tokio_postgres::row::Row> for NodeChildLink {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            parent: row.get("parent"),
            child: row.get("child"),
            group: row.get("group"),
            slot: row.get("slot"),
            form: row.get("form"),
            seriesAnchor: row.get("seriesAnchor"),
            seriesEnd: row.get("seriesEnd"),
            polarity: row.get("polarity"),
            c_parentType: row.get("c_parentType"),
            c_childType: row.get("c_childType"),
		}
	}
}

pub struct GQLSet_NodeChildLink<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_NodeChildLink<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_NodeChildLink;
#[Subscription]
impl SubscriptionShard_NodeChildLink {
    async fn nodeChildLinks(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_NodeChildLink<NodeChildLink>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"nodeChildLinks\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"nodeChildLinks\";", &[]).await.unwrap(),
        };
        let entries: Vec<NodeChildLink> = apply_gql_filter(&filter, rows.into_iter().map(|r| r.into()).collect());

        stream::once(async {
            GQLSet_NodeChildLink {
                nodes: entries, 
            }
        })
    }
    async fn nodeChildLink(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<NodeChildLink>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.nodeChildLinks(ctx, Some(id), filter)).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}