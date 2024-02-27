use rust_shared::{serde, async_graphql, async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject}, GQLError};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::SubError;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};

use crate::utils::db::generic_handlers::queries::{handle_generic_gql_doc_query, handle_generic_gql_collection_query};
use crate::utils::{db::{generic_handlers::{subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet}}, filter::FilterInput, pg_row_to_json::postgres_row_to_struct}};

//wrap_slow_macros!{

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
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Clone)] pub struct GQLSet_Proposal { pub nodes: Vec<Proposal> }
#[Object] impl GQLSet_Proposal { async fn nodes(&self) -> &Vec<Proposal> { &self.nodes } }
impl GQLSet<Proposal> for GQLSet_Proposal {
    fn from(entries: Vec<Proposal>) -> GQLSet_Proposal { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Proposal> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_Proposal;
#[Object] impl QueryShard_Proposal {
	async fn proposals(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Proposal>, GQLError> {
		handle_generic_gql_collection_query(ctx, "feedback_proposals", filter).await
	}
	async fn proposal(&self, ctx: &Context<'_>, id: String) -> Result<Option<Proposal>, GQLError> {
		handle_generic_gql_doc_query(ctx, "feedback_proposals", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_Proposal;
#[Subscription] impl SubscriptionShard_Proposal {
    #[graphql(name = "feedback_proposals")]
    async fn feedback_proposals<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Proposal, SubError>> + 'a {
        handle_generic_gql_collection_subscription::<Proposal, GQLSet_Proposal>(ctx, "feedback_proposals", filter).await
    }
    #[graphql(name = "feedback_proposal")]
    async fn feedback_proposal<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Proposal>, SubError>> + 'a {
        handle_generic_gql_doc_subscription::<Proposal>(ctx, "feedback_proposals", id).await
    }
}

//}