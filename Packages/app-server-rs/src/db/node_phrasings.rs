use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use tokio_postgres::{Client};

use crate::utils::general::{get_first_item_from_stream_in_result_in_future, handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};

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

pub struct GQLSet_MapNodePhrasing { nodes: Vec<MapNodePhrasing> }
#[Object] impl GQLSet_MapNodePhrasing { async fn nodes(&self) -> &Vec<MapNodePhrasing> { &self.nodes } }
impl GQLSet<MapNodePhrasing> for GQLSet_MapNodePhrasing {
    fn from(entries: Vec<MapNodePhrasing>) -> GQLSet_MapNodePhrasing { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<MapNodePhrasing> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_MapNodePhrasing;
#[Subscription]
impl SubscriptionShard_MapNodePhrasing {
    async fn nodePhrasings(&self, ctx: &Context<'_>, id: Option<String>, filter: Option<serde_json::Value>) -> impl Stream<Item = GQLSet_MapNodePhrasing> {
        handle_generic_gql_collection_request::<MapNodePhrasing, GQLSet_MapNodePhrasing>(ctx, "nodePhrasings", filter).await
    }
    async fn nodePhrasing(&self, ctx: &Context<'_>, id: String, filter: Option<serde_json::Value>) -> impl Stream<Item = Option<MapNodePhrasing>> {
        handle_generic_gql_doc_request::<MapNodePhrasing, GQLSet_MapNodePhrasing>(ctx, "nodePhrasings", &id).await
    }
}