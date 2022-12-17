use rust_shared::anyhow::{Error, anyhow};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json};
use rust_shared::async_graphql::{self, Enum};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Row, Client};
use rust_shared::serde;

use crate::utils::db::accessors::get_db_entry;
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entries}}};

use super::commands::_command::{FieldUpdate_Nullable, FieldUpdate};

pub async fn get_node_child_link(ctx: &AccessorContext<'_>, id: &str) -> Result<NodeChildLink, Error> {
    get_db_entry(ctx, "nodeChildLinks", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
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

/// Does not handle mirror-children atm.
pub async fn get_link_under_parent(ctx: &AccessorContext<'_>, node_id: &str, parent_id: &str) -> Result<NodeChildLink, Error> {
	let parent_child_links = get_node_child_links(ctx, Some(parent_id), Some(node_id)).await?;
    Ok(parent_child_links.into_iter().nth(0).ok_or(anyhow!("No link found between claimed parent #{} and child #{}.", parent_id, node_id))?)
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

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum ClaimForm {
    #[graphql(name = "base")] base,
    #[graphql(name = "negation")] negation,
    #[graphql(name = "question")] question,
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
	pub form: Option<ClaimForm>,
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

/*#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct NodeChildLinkInput {
	pub parent: String,
	pub child: String,
	pub group: ChildGroup,
	pub orderKey: String,
	pub form: Option<ClaimForm>,
	pub seriesAnchor: Option<bool>,
	pub seriesEnd: Option<bool>,
	pub polarity: Option<String>,
    #[graphql(name = "c_parentType")]
	pub c_parentType: Option<String>,
    #[graphql(name = "c_childType")]
	pub c_childType: Option<String>,
}*/

#[derive(InputObject, Deserialize)]
pub struct NodeChildLinkUpdates {
	pub orderKey: FieldUpdate<String>,
	pub form: FieldUpdate_Nullable<ClaimForm>,
	pub polarity: FieldUpdate_Nullable<String>,
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