use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_async_graphql;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio_postgres::{Client};

use crate::utils::general::{handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};
use crate::utils::filter::{Filter};

wrap_async_graphql!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Term {
    id: ID,
    accessPolicy: String,
	creator: String,
	createdAt: i64,
    name: String,
	forms: Vec<String>,
    disambiguation: Option<String>,
    r#type: String,
    definition: String,
    note: Option<String>,
    attachments: Vec<serde_json::Value>,
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
    async fn terms<'a>(&self, ctx: &'a Context<'_>, filter: Filter) -> impl Stream<Item = GQLSet_Term> + 'a {
        handle_generic_gql_collection_request::<Term, GQLSet_Term>(ctx, "terms", filter).await
    }
    async fn term<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Option<Term>> + 'a {
        handle_generic_gql_doc_request::<Term>(ctx, "terms", id).await
    }
}

}