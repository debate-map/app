use rust_shared::anyhow::Error;
use rust_shared::{SubError, serde_json, futures};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::db::node_revisions::Attachment;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};

use super::{node_revisions::{get_node_revision}};

pub async fn get_term(ctx: &AccessorContext<'_>, id: &str) -> Result<Term, Error> {
    get_db_entry(ctx, "terms", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_terms_attached(ctx: &AccessorContext<'_>, node_rev_id: &str) -> Result<Vec<Term>, Error> {
    let rev = get_node_revision(ctx, node_rev_id).await?;
    let empty = &vec![];
    let term_values = rev.phrasing["terms"].as_array().unwrap_or(empty);
    let terms_futures = term_values.into_iter().map(|attachment| async {
        get_term(ctx, attachment["id"].as_str().unwrap()).await.unwrap()
    });
    let terms: Vec<Term> = futures::future::join_all(terms_futures).await;
    Ok(terms)
}

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(InputObject, Clone, Serialize, Deserialize)]
//#[graphql(input_name = "TermT0")] // temp
pub struct TermInput {
    pub accessPolicy: String,
    pub name: String,
	pub forms: Vec<String>,
    pub disambiguation: Option<String>,
    pub r#type: String,
    pub definition: String,
    pub note: Option<String>,
    pub attachments: Vec<Attachment>,
}

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
impl From<Row> for Term {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
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