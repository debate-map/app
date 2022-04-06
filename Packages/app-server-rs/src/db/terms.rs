use rust_shared::SubError;
use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio_postgres::{Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

use super::node_revisions::Attachment;

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Term {
    pub id: ID,
    pub accessPolicy: String,
	pub creator: String,
	pub createdAt: i64,
    pub name: String,
	pub forms: Vec<String>,
    pub disambiguation: Option<String>,
    pub r#type: String,
    pub definition: String,
    pub note: Option<String>,
    pub attachments: Vec<Attachment>,
}
impl From<tokio_postgres::row::Row> for Term {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            accessPolicy: row.get("accessPolicy"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            name: row.get("name"),
            forms: row.get("forms"),
            disambiguation: row.get("disambiguation"),
            r#type: row.get("type"),
            definition: row.get("definition"),
            note: row.get("note"),
            attachments: serde_json::from_value(row.get("attachments")).unwrap(),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_Term { nodes: Vec<Term> }
#[Object] impl GQLSet_Term { async fn nodes(&self) -> &Vec<Term> { &self.nodes } }
//#[async_trait]
impl GQLSet<Term> for GQLSet_Term {
    fn from(entries: Vec<Term>) -> GQLSet_Term { Self { nodes: entries } }
    //async fn nodes(&self) -> &Vec<Term> { &self.nodes }
    fn nodes(&self) -> &Vec<Term> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Term;
#[Subscription]
impl SubscriptionShard_Term {
    async fn terms<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Term, SubError>> + 'a {
        handle_generic_gql_collection_request::<Term, GQLSet_Term>(ctx, "terms", filter).await
    }
    async fn term<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Term>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Term>(ctx, "terms", id).await
    }
}

}