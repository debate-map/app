use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::Error;
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{serde_json, GQLError, SubError};

use crate::utils::db::accessors::{get_db_entry, AccessorContext};
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::{
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};

use super::commands::_command::{CanNullOrOmit, CanOmit};

#[rustfmt::skip]
pub async fn get_map(ctx: &AccessorContext<'_>, id: &str) -> Result<Map, Error> {
	get_db_entry(ctx, "maps", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros! {

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Map {
	pub id: ID,
	pub accessPolicy: String,
	pub creator: String,
	pub createdAt: i64,
	pub name: String,
	pub note: Option<String>,
	pub noteInline: Option<bool>,
	pub rootNode: String,
	pub defaultExpandDepth: i32,
	pub nodeAccessPolicy: Option<String>,
	pub featured: Option<bool>,
	pub editors: Vec<String>,
	pub edits: i32,
	pub editedAt: Option<i64>,
	pub extras: JSONValue,
}
impl From<Row> for Map {
	fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct MapInput {
	pub accessPolicy: String,
	pub name: String,
	pub note: Option<String>,
	pub noteInline: Option<bool>,
	pub defaultExpandDepth: i32,
	pub nodeAccessPolicy: Option<String>,
	pub featured: Option<bool>,
	pub editors: Vec<String>,
	//pub edits: i32,
	//pub editedAt: Option<i64>,
	pub extras: JSONValue,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct MapUpdates {
	pub accessPolicy: CanOmit<String>,
	pub name: CanOmit<String>,
	pub note: CanNullOrOmit<String>,
	pub noteInline: CanNullOrOmit<bool>,
	pub defaultExpandDepth: CanOmit<i32>,
	pub nodeAccessPolicy: CanNullOrOmit<String>,
	pub featured: CanNullOrOmit<bool>,
	pub editors: CanOmit<Vec<String>>,
	pub extras: CanOmit<JSONValue>,
}

#[derive(Clone)] pub struct GQLSet_Map { pub nodes: Vec<Map> }
#[Object] impl GQLSet_Map { async fn nodes(&self) -> &Vec<Map> { &self.nodes } }
impl GQLSet<Map> for GQLSet_Map {
	fn from(entries: Vec<Map>) -> GQLSet_Map { Self { nodes: entries } }
	fn nodes(&self) -> &Vec<Map> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_Map;
#[Object] impl QueryShard_Map {
	async fn maps(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<Map>, GQLError> {
		handle_generic_gql_collection_query(ctx, "maps", filter).await
	}
	async fn map(&self, ctx: &Context<'_>, id: String) -> Result<Option<Map>, GQLError> {
		handle_generic_gql_doc_query(ctx, "maps", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_Map;
#[Subscription] impl SubscriptionShard_Map {
	async fn maps<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Map, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<Map, GQLSet_Map>(ctx, "maps", filter).await
	}
	async fn map<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Map>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<Map>(ctx, "maps", id).await
	}
}

}
