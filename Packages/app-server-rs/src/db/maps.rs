use rust_shared::SubError;
use async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use tokio_postgres::{Client};

use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput}};

wrap_slow_macros!{

/*cached_expand!{
const ce_args: &str = r##"
id = "command_runs"
excludeLinesWith = "#[graphql(name"
"##;*/

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Map {
    pub id: ID,
    pub accessPolicy: String,
    pub name: String,
    pub note: Option<String>,
    pub noteInline: Option<bool>,
    pub rootNode: String,
    pub defaultExpandDepth: i32,
    pub nodeAccessPolicy: Option<String>,
    pub featured: Option<bool>,
	pub editors: Vec<String>,
	pub creator: String,
	pub createdAt: i64,
	pub edits: i32,
	pub editedAt: Option<i64>,
    pub extras: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for Map {
	fn from(row: tokio_postgres::row::Row) -> Self {
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            accessPolicy: row.get("accessPolicy"),
            name: row.get("name"),
            note: row.get("note"),
            noteInline: row.get("noteInline"),
            rootNode: row.get("rootNode"),
            defaultExpandDepth: row.get("defaultExpandDepth"),
            nodeAccessPolicy: row.get("nodeAccessPolicy"),
            featured: row.get("featured"),
            editors: row.get("editors"),
            creator: row.get("creator"),
            createdAt: row.get("createdAt"),
            edits: row.get("edits"),
            editedAt: row.get("editedAt"),
            extras: serde_json::from_value(row.get("extras")).unwrap(),
		}
	}
}

#[derive(Clone)] pub struct GQLSet_Map { nodes: Vec<Map> }
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
    async fn map<'a>(&self, ctx: &'a Context<'_>, id: String, _filter: Option<FilterInput>) -> impl Stream<Item = Result<Option<Map>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Map>(ctx, "maps", id).await
    }
}

}