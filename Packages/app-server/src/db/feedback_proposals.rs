use futures_util::{stream, Stream, TryFutureExt};
use graphlink_rust::{handle_generic_gql_collection_query, handle_generic_gql_doc_query, FilterInput, GQLError, SubError};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::{
	async_graphql,
	async_graphql::{Context, Object, OutputType, Schema, SimpleObject, Subscription, ID},
	serde,
};

use crate::gql_set_impl;
use crate::utils::db::generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet};

wrap_slow_macros! {

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
gql_set_impl!(Proposal);

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
	async fn feedback_proposals<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>, cached_entry_hashes: Option<std::collections::HashMap<String, String>>) -> impl Stream<Item = Result<GQLSet_Proposal, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<Proposal, GQLSet_Proposal>(ctx, "feedback_proposals", filter, cached_entry_hashes, None).await
	}
	#[graphql(name = "feedback_proposal")]
	async fn feedback_proposal<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Proposal>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<Proposal>(ctx, "feedback_proposals", id).await
	}
}

}
