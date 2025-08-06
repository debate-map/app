use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::Error;
use rust_shared::async_graphql::{Context, Enum, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, serde_json, GQLError, SubError};

use crate::gql_set_impl;
use crate::utils::db::accessors::{get_db_entry, AccessorContext};
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::{
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

use super::commands::_command::{CanNullOrOmit, CanOmit};

#[rustfmt::skip]
pub async fn get_share(ctx: &AccessorContext<'_>, id: &str) -> Result<Share, Error> {
    get_db_entry(ctx, "shares", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros! {

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum ShareType {
	#[graphql(name = "map")] map,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Share {
	pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub name: String,
	pub r#type: ShareType,
	pub mapID: Option<String>,
	pub mapView: JSONValue,
}
impl From<Row> for Share {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct ShareInput {
	pub name: String,
	pub r#type: ShareType,
	pub mapID: Option<String>,
	pub mapView: JSONValue,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct ShareUpdates {
	pub name: CanOmit<String>,
	//pub r#type: FieldUpdate<ShareType>,
	pub mapID: CanNullOrOmit<String>,
	pub mapView: CanOmit<JSONValue>,
}

gql_set_impl!(Share);

#[derive(Default)] pub struct QueryShard_Share;
#[Object] impl QueryShard_Share {
	async fn shares(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Share>, GQLError> {
		handle_generic_gql_collection_query(ctx, "shares", filter).await
	}
	async fn share(&self, ctx: &Context<'_>, id: String) -> Result<Option<Share>, GQLError> {
		handle_generic_gql_doc_query(ctx, "shares", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_Share;
#[Subscription] impl SubscriptionShard_Share {
	async fn shares<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Share, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<Share, GQLSet_Share>(ctx, "shares", filter, None).await
	}
	async fn share<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Share>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<Share>(ctx, "shares", id).await
	}
}

}
