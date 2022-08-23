use anyhow::Error;
use rust_shared::SubError;
use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio_postgres::{Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};
use crate::utils::type_aliases::JSONValue;

pub async fn get_node_revision(ctx: &AccessorContext<'_>, id: &str) -> Result<MapNodeRevision, Error> {
    get_db_entry(ctx, "nodeRevisions", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub equation: Option<JSONValue>,
    pub references: Option<JSONValue>,
    pub quote: Option<JSONValue>,
    pub media: Option<JSONValue>,
    //pub media: Option<MediaAttachment>,
}

/*#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MediaAttachment {
    pub id: string,
    /// whether the image/video is claimed to be a capturing of real-world footage
	pub captured: boolean,
    /// used to limit the display-width, eg. to keep a tall-but-skinny image from extending multiple screens down
	pub previewWidth: Option<f64>,
	pub sourceChains: SourceChain[],
}*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MapNodeRevision {
    pub id: ID,
    pub node: String,
    pub replaced_by: String,
    pub creator: String,
    pub createdAt: i64,
    pub phrasing: JSONValue,
    #[graphql(name = "phrasing_tsvector")]
    #[serde(skip_serializing)] // makes-so when serializing the struct for saving to the db, this field is excluded (as it must be, since it's auto-generated)
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
            replaced_by: row.get("replaced_by"),
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
    async fn nodeRevisions<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_MapNodeRevision, SubError>> + 'a {
        handle_generic_gql_collection_request::<MapNodeRevision, GQLSet_MapNodeRevision>(ctx, "nodeRevisions", filter).await
    }
    async fn nodeRevision<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Result<Option<MapNodeRevision>, SubError>> + 'a {
        handle_generic_gql_doc_request::<MapNodeRevision>(ctx, "nodeRevisions", id).await
    }
}

}