use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(SimpleObject)]
pub struct Proposal {
    id: ID,
    r#type: String,
    title: String,
    text: String,
    creator: String,
	createdAt: i64,
	editedAt: Option<i64>,
	completedAt: Option<i64>,
}
impl From<tokio_postgres::row::Row> for Proposal {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            r#type: row.get("type"),
            title: row.get("title"),
            text: row.get("text"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            editedAt: row.get("editedAt"),
            completedAt: row.get("completedAt"),
		}
	}
}

pub struct GQLSet_Proposal<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_Proposal<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_Proposal;
#[Subscription]
impl SubscriptionShard_Proposal {
    #[graphql(name = "feedback_proposals")]
    async fn feedback_proposals(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_Proposal<Proposal>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"feedback_proposals\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"feedback_proposals\";", &[]).await.unwrap(),
        };
        let entries: Vec<Proposal> = rows.into_iter().map(|r| r.into()).collect();

        stream::once(async {
            GQLSet_Proposal {
                nodes: entries, 
            }
        })
    }
    #[graphql(name = "feedback_proposal")]
    async fn feedback_proposal(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<Proposal>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.feedback_proposals(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}