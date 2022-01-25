use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, apply_gql_filter};

#[derive(SimpleObject)]
pub struct Share {
    id: ID,
	creator: String,
	createdAt: i64,
    name: String,
    r#type: String,
	mapID: Option<String>,
	mapView: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for Share {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            r#type: row.get("type"),
            mapID: row.get("mapID"),
            mapView: serde_json::from_value(row.get("mapView")).unwrap(),
		}
	}
}

pub struct GQLSet_Share<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_Share<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_Share;
#[Subscription]
impl SubscriptionShard_Share {
    async fn shares(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_Share<Share>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"shares\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"shares\";", &[]).await.unwrap(),
        };
        let entries: Vec<Share> = apply_gql_filter(&filter, rows.into_iter().map(|r| r.into()).collect());

        stream::once(async {
            GQLSet_Share {
                nodes: entries, 
            }
        })
    }
    async fn share(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<Share>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.shares(ctx, Some(id), filter)).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}