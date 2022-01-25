use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(SimpleObject)]
pub struct Media {
    id: ID,
    accessPolicy: String,
	creator: String,
	createdAt: i64,
    name: String,
    r#type: String,
    url: String,
    description: String,
}
impl From<tokio_postgres::row::Row> for Media {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            accessPolicy: row.get("accessPolicy"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            r#type: row.get("type"),
            url: row.get("url"),
            description: row.get("description"),
		}
	}
}

pub struct GQLSet_Media<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_Media<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_Media;
#[Subscription]
impl SubscriptionShard_Media {
    async fn medias(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_Media<Media>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"medias\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"medias\";", &[]).await.unwrap(),
        };
        let entries: Vec<Media> = rows.into_iter().map(|r| r.into()).collect();

        stream::once(async {
            GQLSet_Media {
                nodes: entries, 
            }
        })
    }
    async fn media(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<Media>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.medias(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}