use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::Error;
use rust_shared::async_graphql::{self, Enum, MaybeUndefined};
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::{futures, serde_json, GQLError, SubError};

use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::{
	accessors::{get_db_entry, AccessorContext},
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

use super::_shared::attachments::Attachment;
use super::commands::_command::{CanNullOrOmit, CanOmit};
use super::node_revisions::get_node_revision;

#[rustfmt::skip]
pub async fn get_term(ctx: &AccessorContext<'_>, id: &str) -> Result<Term, Error> {
    get_db_entry(ctx, "terms", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
// sync:js
pub async fn get_terms_attached(ctx: &AccessorContext<'_>, node_rev_id: &str) -> Result<Vec<Term>, Error> {
	let rev = get_node_revision(ctx, node_rev_id).await?;
	/*let empty = &vec![];
	let term_values = rev.phrasing["terms"].as_array().unwrap_or(empty);*/
	let terms_futures = rev.phrasing.terms.into_iter().map(|attachment| async move { get_term(ctx, &attachment.id).await.unwrap() });
	let terms: Vec<Term> = futures::future::join_all(terms_futures).await;
	Ok(terms)
}

wrap_slow_macros! {

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum TermType {
	#[graphql(name = "commonNoun")] commonNoun,
	#[graphql(name = "properNoun")] properNoun,
	#[graphql(name = "adjective")] adjective,
	#[graphql(name = "verb")] verb,
	#[graphql(name = "adverb")] adverb,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Term {
	pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub accessPolicy: String,
	pub name: String,
	pub forms: Vec<String>,
	pub disambiguation: Option<String>,
	pub r#type: TermType,
	pub definition: String,
	pub note: Option<String>,
	pub attachments: Vec<Attachment>,
}
impl From<Row> for Term {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct TermInput {
	pub accessPolicy: String,
	pub name: String,
	pub forms: Vec<String>,
	pub disambiguation: Option<String>,
	pub r#type: TermType,
	pub definition: String,
	pub note: Option<String>,
	pub attachments: Vec<Attachment>,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct TermUpdates {
	pub accessPolicy: CanOmit<String>,
	pub name: CanOmit<String>,
	pub forms: CanOmit<Vec<String>>,
	pub disambiguation: CanNullOrOmit<String>,
	pub r#type: CanOmit<TermType>,
	pub definition: CanOmit<String>,
	pub note: CanNullOrOmit<String>,
	pub attachments: CanOmit<Vec<Attachment>>,
}

#[derive(Clone)] pub struct GQLSet_Term { pub nodes: Vec<Term> }
#[Object] impl GQLSet_Term { async fn nodes(&self) -> &Vec<Term> { &self.nodes } }
//#[async_trait]
impl GQLSet<Term> for GQLSet_Term {
	fn from(entries: Vec<Term>) -> GQLSet_Term { Self { nodes: entries } }
	//async fn nodes(&self) -> &Vec<Term> { &self.nodes }
	fn nodes(&self) -> &Vec<Term> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_Term;
#[Object] impl QueryShard_Term {
	async fn terms(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Term>, GQLError> {
		handle_generic_gql_collection_query(ctx, "terms", filter).await
	}
	async fn term(&self, ctx: &Context<'_>, id: String) -> Result<Option<Term>, GQLError> {
		handle_generic_gql_doc_query(ctx, "terms", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_Term;
#[Subscription] impl SubscriptionShard_Term {
	async fn terms<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Term, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<Term, GQLSet_Term>(ctx, "terms", filter, None).await
	}
	async fn term<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Term>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<Term>(ctx, "terms", id).await
	}
}

}
