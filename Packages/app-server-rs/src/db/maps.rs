use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(SimpleObject)]
pub struct Map {
    id: ID,
    accessPolicy: String,
    name: String,
    note: Option<String>,
    noteInline: Option<bool>,
    rootNode: String,
    defaultExpandDepth: i32,
    nodeAccessPolicy: Option<String>,
    featured: Option<bool>,
	editors: Vec<String>,
	creator: String,
	createdAt: i64,
	edits: i32,
	editedAt: Option<i64>,
    extras: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for Map {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            accessPolicy: row.get("accessPolicy"),
            name: row.get("name"),
            note: row.get("note"),
            noteInline: row.get("noteInline"),
            rootNode: row.get("rootNode"),
            defaultExpandDepth: row.get("defaultExpandDepth"),
            nodeAccessPolicy: row.get("nodeAccessPolicy"),
            featured: row.get("featured"),
            editors: row.get("editors"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            edits: row.get("edits"),
            editedAt: row.get("editedAt"),
            extras: serde_json::from_value(row.get("extras")).unwrap(),
		}
	}
}

pub struct GQLSet_Map<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_Map<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_Map;
#[Subscription]
impl SubscriptionShard_Map {
    async fn maps(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_Map<Map>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"maps\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"maps\";", &[]).await.unwrap(),
        };
        let entries: Vec<Map> = rows.into_iter().map(|r| r.into()).collect();

        stream::once(async {
            GQLSet_Map {
                nodes: entries, 
            }
        })
    }
    async fn map(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<Map>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.maps(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}