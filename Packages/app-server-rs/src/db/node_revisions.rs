use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::Filter}};
use crate::utils::type_aliases::JSONValue;

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub equation: Option<JSONValue>,
    pub references: Option<JSONValue>,
    pub quote: Option<JSONValue>,
    pub media: Option<JSONValue>,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MapNodeRevision {
    pub id: ID,
    pub node: String,
    pub creator: String,
    pub createdAt: i64,
    pub phrasing: JSONValue,
    #[graphql(name = "phrasing_tsvector")]
    pub phrasing_tsvector: String,
    pub note: Option<String>,
    pub displayDetails: Option<JSONValue>,
    pub attachments: Vec<Attachment>,
    //pub attachments: Vec<JSONValue>,
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
            /*equation: row.get("equation"),
            references: row.get("references"),
            quote: row.get("quote"),
            media: row.get("media"),*/
            attachments: serde_json::from_value(row.get("attachments")).unwrap(),
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

}