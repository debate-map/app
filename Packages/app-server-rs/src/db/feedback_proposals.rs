use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::general::{handle_generic_gql_collection_request, GQLSet, handle_generic_gql_doc_request};
use crate::utils::filter::{Filter};

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Proposal {
    id: ID,
    r#type: String,
    title: String,
    text: String,
    creator: String,
	createdAt: i64,
	editedAt: Option<i64>,
	completedAt: Option<i64>,
}
impl From<tokio_postgres::row::Row> for Proposal {
	fn from(row: tokio_postgres::row::Row) -> Self {
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
    async fn feedback_proposals<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Filter) -> impl Stream<Item = GQLSet_Proposal> + 'a {
        handle_generic_gql_collection_request::<Proposal, GQLSet_Proposal>(ctx, "feedback_proposals", filter).await
    }
    #[graphql(name = "feedback_proposal")]
    async fn feedback_proposal<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Filter) -> impl Stream<Item = Option<Proposal>> + 'a {
        handle_generic_gql_doc_request::<Proposal>(ctx, "feedback_proposals", id).await
    }
}

}