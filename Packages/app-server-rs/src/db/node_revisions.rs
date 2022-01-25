use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, apply_gql_filter};

#[derive(SimpleObject)]
pub struct MapNodeRevision {
    id: ID,
    node: String,
	creator: String,
	createdAt: i64,
    phrasing: serde_json::Value,
    #[graphql(name = "phrasing_tsvector")]
	phrasing_tsvector: String,
	note: Option<String>,
	displayDetails: Option<serde_json::Value>,
	equation: Option<serde_json::Value>,
	references: Option<serde_json::Value>,
	quote: Option<serde_json::Value>,
	media: Option<serde_json::Value>,
}
impl From<tokio_postgres::row::Row> for MapNodeRevision {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            node: row.get("node"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            phrasing: row.get("phrasing"),
            //phrasing_tsvector: row.get("phrasing_tsvector"),
            //phrasing_tsvector: serde_json::from_value(row.get("phrasing_tsvector")).unwrap(),
            phrasing_tsvector: "n/a".to_owned(), // don't know how to convert tsvector into string (it's fine atm, since client doesn't need it anyway)
            note: row.get("note"),
            displayDetails: row.get("displayDetails"),
            equation: row.get("equation"),
            references: row.get("references"),
            quote: row.get("quote"),
            media: row.get("media"),
		}
	}
}

pub struct GQLSet_MapNodeRevision<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_MapNodeRevision<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

#[derive(Default)]
pub struct SubscriptionShard_MapNodeRevision;
#[Subscription]
impl SubscriptionShard_MapNodeRevision {
    async fn nodeRevisions(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_MapNodeRevision<MapNodeRevision>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"nodeRevisions\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"nodeRevisions\";", &[]).await.unwrap(),
        };
        let entries: Vec<MapNodeRevision> = apply_gql_filter(&filter, rows.into_iter().map(|r| r.into()).collect());

        stream::once(async {
            GQLSet_MapNodeRevision {
                nodes: entries, 
            }
        })
    }
    async fn nodeRevision(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<MapNodeRevision>> {
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.nodeRevisions(ctx, Some(id), filter)).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}