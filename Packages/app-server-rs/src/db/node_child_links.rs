use rust_shared::anyhow::Error;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json};
use rust_shared::async_graphql::{self, Enum};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entries}}};

pub async fn get_node_child_links(ctx: &AccessorContext<'_>, parent_id: Option<&str>, child_id: Option<&str>) -> Result<Vec<NodeChildLink>, Error> {
    let mut filter_map = serde_json::Map::new();
    if let Some(parent_id) = parent_id {
        filter_map.insert("parent".to_owned(), json!({"equalTo": parent_id}));
    }
    if let Some(child_id) = child_id {
        filter_map.insert("child".to_owned(), json!({"equalTo": child_id}));
    }
    get_db_entries(ctx, "nodeChildLinks", &Some(JSONValue::Object(filter_map))).await
}

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum ChildGroup {
    #[graphql(name = "generic")] generic,
    #[graphql(name = "truth")] truth,
    #[graphql(name = "relevance")] relevance,
    // testing
    #[graphql(name = "neutrality")] neutrality,
    #[graphql(name = "freeform")] freeform,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NodeChildLink {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub parent: String,
	pub child: String,
	pub group: ChildGroup,
	pub orderKey: String,
	pub form: Option<String>,
	pub seriesAnchor: Option<bool>,
	pub seriesEnd: Option<bool>,
	pub polarity: Option<String>,
    #[graphql(name = "c_parentType")]
	pub c_parentType: Option<String>,
    #[graphql(name = "c_childType")]
	pub c_childType: Option<String>,
}
impl From<Row> for NodeChildLink {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Clone)] pub struct GQLSet_NodeChildLink { nodes: Vec<NodeChildLink> }
#[Object] impl GQLSet_NodeChildLink { async fn nodes(&self) -> &Vec<NodeChildLink> { &self.nodes } }
impl GQLSet<NodeChildLink> for GQLSet_NodeChildLink {
    fn from(entries: Vec<NodeChildLink>) -> GQLSet_NodeChildLink { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<NodeChildLink> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_NodeChildLink;
#[Subscription]
impl SubscriptionShard_NodeChildLink {
    async fn nodeChildLinks<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodeChildLink, SubError>> + 'a {
        handle_generic_gql_collection_request::<NodeChildLink, GQLSet_NodeChildLink>(ctx, "nodeChildLinks", filter).await
    }
    async fn nodeChildLink<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodeChildLink>, SubError>> + 'a {
        handle_generic_gql_doc_request::<NodeChildLink>(ctx, "nodeChildLinks", id).await
    }
}

}