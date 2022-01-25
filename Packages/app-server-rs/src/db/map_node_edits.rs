use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, apply_gql_filter};

#[derive(SimpleObject)]
pub struct MapNodeEdit {
    id: ID,
	map: String,
	node: String,
	time: i64,
	r#type: String,
}
impl From<tokio_postgres::row::Row> for MapNodeEdit {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            map: row.get("map"),
            node: row.get("node"),
            time: row.get("time"),
            r#type: row.get("type"),
		}
	}
}

pub struct GQLSet_MapNodeEdit<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_MapNodeEdit<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_MapNodeEdit;
#[Subscription]
impl SubscriptionShard_MapNodeEdit {
    async fn mapNodeEdits(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_MapNodeEdit<MapNodeEdit>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"mapNodeEdits\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"mapNodeEdits\";", &[]).await.unwrap(),
        };
        let entries: Vec<MapNodeEdit> = apply_gql_filter(&filter, rows.into_iter().map(|r| r.into()).collect());

        stream::once(async {
            GQLSet_MapNodeEdit {
                nodes: entries, 
            }
        })
    }
    async fn mapNodeEdit(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<MapNodeEdit>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.mapNodeEdits(ctx, Some(id), filter)).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}