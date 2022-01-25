use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(SimpleObject)]
pub struct MapNodePhrasing {
    id: ID,
	creator: String,
	createdAt: i64,
	node: String,
	r#type: String,
    #[graphql(name = "text_base")]
	text_base: String,
    #[graphql(name = "text_negation")]
	text_negation: String,
    #[graphql(name = "text_question")]
	text_question: String,
	note: String,
	terms: Vec<serde_json::Value>,
	references: Vec<String>,
}
impl From<tokio_postgres::row::Row> for MapNodePhrasing {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            node: row.get("node"),
            r#type: row.get("type"),
            text_base: row.get("text_base"),
            text_negation: row.get("text_negation"),
            text_question: row.get("text_question"),
            note: row.get("note"),
            terms: row.get("terms"),
            references: row.get("references"),
		}
	}
}

pub struct GQLSet_MapNodePhrasing<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_MapNodePhrasing<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_MapNodePhrasing;
#[Subscription]
impl SubscriptionShard_MapNodePhrasing {
    async fn mapNodePhrasings(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_MapNodePhrasing<MapNodePhrasing>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"mapNodePhrasings\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"mapNodePhrasings\";", &[]).await.unwrap(),
        };
        let entries: Vec<MapNodePhrasing> = rows.into_iter().map(|r| r.into()).collect();

        stream::once(async {
            GQLSet_MapNodePhrasing {
                nodes: entries, 
            }
        })
    }
    async fn mapNodePhrasing(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<MapNodePhrasing>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.mapNodePhrasings(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}