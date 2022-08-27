use rust_shared::{serde, async_graphql, async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject}};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::SubError;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

//wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)] //#[serde(crate = "rust_shared::serde")]
pub struct Proposal {
    pub id: ID,
    pub r#type: String,
    pub title: String,
    pub text: String,
    pub creator: String,
	pub createdAt: i64,
	pub editedAt: Option<i64>,
	pub completedAt: Option<i64>,
}
impl From<Row> for Proposal {
	fn from(row: Row) -> Self {
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

#[derive(Clone)] pub struct GQLSet_Proposal { nodes: Vec<Proposal> }
#[Object] impl GQLSet_Proposal { async fn nodes(&self) -> &Vec<Proposal> { &self.nodes } }
impl GQLSet<Proposal> for GQLSet_Proposal {
    fn from(entries: Vec<Proposal>) -> GQLSet_Proposal { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Proposal> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Proposal;
#[Subscription]
impl SubscriptionShard_Proposal {
    #[graphql(name = "feedback_proposals")]
    async fn feedback_proposals<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Proposal, SubError>> + 'a {
        handle_generic_gql_collection_request::<Proposal, GQLSet_Proposal>(ctx, "feedback_proposals", filter).await
    }
    #[graphql(name = "feedback_proposal")]
    async fn feedback_proposal<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Result<Option<Proposal>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Proposal>(ctx, "feedback_proposals", id).await
    }
}

//}