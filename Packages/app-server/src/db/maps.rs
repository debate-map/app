use rust_shared::anyhow::Error;
use rust_shared::serde_json::json;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json};
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::accessors::{AccessorContext, get_db_entry};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

use super::commands::_command::{FieldUpdate_Nullable, FieldUpdate};

pub async fn get_map(ctx: &AccessorContext<'_>, id: &str) -> Result<Map, Error> {
    get_db_entry(ctx, "maps", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Map {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub accessPolicy: String,
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

#[derive(InputObject, Deserialize)]
pub struct MapUpdates {
    pub accessPolicy: FieldUpdate<String>,
    pub name: FieldUpdate<String>,
    pub note: FieldUpdate_Nullable<String>,
    pub noteInline: FieldUpdate_Nullable<bool>,
    pub defaultExpandDepth: FieldUpdate<i32>,
    pub nodeAccessPolicy: FieldUpdate_Nullable<String>,
    pub featured: FieldUpdate_Nullable<bool>,
	pub editors: FieldUpdate<Vec<String>>,
    pub extras: FieldUpdate<JSONValue>,
}

#[derive(Clone)] pub struct GQLSet_Map { pub nodes: Vec<Map> }
#[Object] impl GQLSet_Map { async fn nodes(&self) -> &Vec<Map> { &self.nodes } }
impl GQLSet<Map> for GQLSet_Map {
    fn from(entries: Vec<Map>) -> GQLSet_Map { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Map> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Map;
#[Subscription]
impl SubscriptionShard_Map {
    async fn maps<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Map, SubError>> + 'a {
        handle_generic_gql_collection_request::<Map, GQLSet_Map>(ctx, "maps", filter).await
    }
    async fn map<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Map>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Map>(ctx, "maps", id).await
    }
}

}