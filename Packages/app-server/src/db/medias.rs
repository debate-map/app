use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::Error;
use rust_shared::async_graphql;
use rust_shared::async_graphql::Enum;
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::{GQLError, SubError};

use crate::utils::db::accessors::{get_db_entry, AccessorContext};
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::{
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

use super::commands::_command::CanOmit;

#[rustfmt::skip]
pub async fn get_media(ctx: &AccessorContext<'_>, id: &str) -> Result<Media, Error> {
	get_db_entry(ctx, "medias", &Some(json!({
		"id": {"equalTo": id}
	}))).await
}

wrap_slow_macros! {

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum MediaType {
	#[graphql(name = "image")] image,
	#[graphql(name = "video")] video,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Media {
	pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub accessPolicy: String,
	pub name: String,
	pub r#type: MediaType,
	pub url: String,
	pub description: String,
}
impl From<Row> for Media {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct MediaInput {
	pub accessPolicy: String,
	pub name: String,
	pub r#type: MediaType,
	pub url: String,
	pub description: String,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct MediaUpdates {
	pub accessPolicy: CanOmit<String>,
	pub name: CanOmit<String>,
	pub r#type: CanOmit<MediaType>,
	pub url: CanOmit<String>,
	pub description: CanOmit<String>,
}

#[derive(Clone)] pub struct GQLSet_Media { pub nodes: Vec<Media> }
#[Object] impl GQLSet_Media { async fn nodes(&self) -> &Vec<Media> { &self.nodes } }
impl GQLSet<Media> for GQLSet_Media {
	fn from(entries: Vec<Media>) -> GQLSet_Media { Self { nodes: entries } }
	fn nodes(&self) -> &Vec<Media> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_Media;
#[Object] impl QueryShard_Media {
	async fn medias(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Media>, GQLError> {
		handle_generic_gql_collection_query(ctx, "medias", filter).await
	}
	async fn media(&self, ctx: &Context<'_>, id: String) -> Result<Option<Media>, GQLError> {
		handle_generic_gql_doc_query(ctx, "medias", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_Media;
#[Subscription] impl SubscriptionShard_Media {
	async fn medias<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Media, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<Media, GQLSet_Media>(ctx, "medias", filter, None).await
	}
	async fn media<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Media>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<Media>(ctx, "medias", id).await
	}
}

}
