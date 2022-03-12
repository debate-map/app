use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::general::{handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};
use crate::utils::filter::{Filter};

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
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

#[derive(Clone)] pub struct GQLSet_MapNodeRevision { nodes: Vec<MapNodeRevision> }
#[Object] impl GQLSet_MapNodeRevision { async fn nodes(&self) -> &Vec<MapNodeRevision> { &self.nodes } }
impl GQLSet<MapNodeRevision> for GQLSet_MapNodeRevision {
    fn from(entries: Vec<MapNodeRevision>) -> GQLSet_MapNodeRevision { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<MapNodeRevision> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_MapNodeRevision;
#[Subscription]
impl SubscriptionShard_MapNodeRevision {
    async fn nodeRevisions<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Filter) -> impl Stream<Item = GQLSet_MapNodeRevision> + 'a {
        handle_generic_gql_collection_request::<MapNodeRevision, GQLSet_MapNodeRevision>(ctx, "nodeRevisions", filter).await
    }
    async fn nodeRevision<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Filter) -> impl Stream<Item = Option<MapNodeRevision>> + 'a {
        handle_generic_gql_doc_request::<MapNodeRevision>(ctx, "nodeRevisions", id).await
    }
}