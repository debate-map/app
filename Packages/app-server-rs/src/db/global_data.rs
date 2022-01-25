use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(SimpleObject)]
pub struct GlobalData {
    id: ID,
    extras: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for GlobalData {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            extras: serde_json::from_value(row.get("extras")).unwrap(),
		}
	}
}

pub struct GQLSet_GlobalData<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_GlobalData<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_GlobalData;
#[Subscription]
impl SubscriptionShard_GlobalData {
    async fn globalData(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_GlobalData<GlobalData>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"globalData\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"globalData\";", &[]).await.unwrap(),
        };
        let entries: Vec<GlobalData> = rows.into_iter().map(|r| r.into()).collect();

        stream::once(async {
            GQLSet_GlobalData {
                nodes: entries, 
            }
        })
    }
    async fn globalDatum(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<GlobalData>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.globalData(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}