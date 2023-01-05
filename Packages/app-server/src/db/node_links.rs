use rust_shared::anyhow::{Error, anyhow};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{SubError, serde_json, should_be_unreachable, to_anyhow};
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
use crate::utils::general::order_key::OrderKey;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entries}}};

use super::_shared::access_policy_target::AccessPolicyTarget;
use super::commands::_command::{FieldUpdate_Nullable, FieldUpdate};
use super::nodes::get_node;
use super::nodes_::_node::Node;
use super::nodes_::_node_type::NodeType;

pub async fn get_node_link(ctx: &AccessorContext<'_>, id: &str) -> Result<NodeLink, Error> {
    get_db_entry(ctx, "nodeLinks", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}
pub async fn get_node_links(ctx: &AccessorContext<'_>, parent_id: Option<&str>, child_id: Option<&str>) -> Result<Vec<NodeLink>, Error> {
    let mut filter_map = serde_json::Map::new();
    if let Some(parent_id) = parent_id {
        filter_map.insert("parent".to_owned(), json!({"equalTo": parent_id}));
    }
    if let Some(child_id) = child_id {
        filter_map.insert("child".to_owned(), json!({"equalTo": child_id}));
    }
    get_db_entries(ctx, "nodeLinks", &Some(JSONValue::Object(filter_map))).await
}

/// Does not handle mirror-children atm.
pub async fn get_first_link_under_parent(ctx: &AccessorContext<'_>, node_id: &str, parent_id: &str) -> Result<NodeLink, Error> {
	let parent_child_links = get_node_links(ctx, Some(parent_id), Some(node_id)).await?;
    Ok(parent_child_links.into_iter().nth(0).ok_or(anyhow!("No link found between claimed parent #{} and child #{}.", parent_id, node_id))?)
}

pub async fn get_highest_order_key_under_parent(ctx: &AccessorContext<'_>, parent_id: Option<&str>) -> Result<OrderKey, Error> {
    let parent_child_links = get_node_links(ctx, parent_id, None).await?;
    match parent_child_links.len() {
        0 => return Ok(OrderKey::mid()),
        _ => {
            let parent_last_order_key = parent_child_links.into_iter()
                //.max_by_key(|a| a.orderKey).ok_or_else(should_be_unreachable)?.orderKey;
                .max_by(|a, b| a.orderKey.cmp(&b.orderKey)).ok_or_else(should_be_unreachable)?.orderKey;
            Ok(parent_last_order_key)
        },
    }
}

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash, Debug)]
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

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum Polarity {
    #[graphql(name = "supporting")] supporting,
    #[graphql(name = "opposing")] opposing,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NodeLink {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
	pub parent: String,
	pub child: String,
	pub group: ChildGroup,
	pub orderKey: OrderKey,
	pub form: Option<ClaimForm>,
	pub seriesAnchor: Option<bool>,
	pub seriesEnd: Option<bool>,
	pub polarity: Option<Polarity>,
    #[graphql(name = "c_parentType")]
	pub c_parentType: NodeType,
    #[graphql(name = "c_childType")]
	pub c_childType: NodeType,
    #[graphql(name = "c_accessPolicyTargets")]
    pub c_accessPolicyTargets: Vec<AccessPolicyTarget>,
}
impl From<Row> for NodeLink {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct NodeLinkInput {
    /// Marked as optional, since in some contexts it's not needed. (eg. for add_child_node)
	pub parent: Option<String>,
    /// Marked as optional, since in some contexts it's not needed. (eg. for add_child_node)
	pub child: Option<String>,
	pub group: ChildGroup,
	pub orderKey: OrderKey,
	pub form: Option<ClaimForm>,
	pub seriesAnchor: Option<bool>,
	pub seriesEnd: Option<bool>,
	pub polarity: Option<Polarity>,
}

#[derive(InputObject, Deserialize)]
pub struct NodeLinkUpdates {
	pub orderKey: FieldUpdate<OrderKey>,
	pub form: FieldUpdate_Nullable<ClaimForm>,
	pub polarity: FieldUpdate_Nullable<Polarity>,
}

#[derive(Clone)] pub struct GQLSet_NodeLink { pub nodes: Vec<NodeLink> }
#[Object] impl GQLSet_NodeLink { async fn nodes(&self) -> &Vec<NodeLink> { &self.nodes } }
impl GQLSet<NodeLink> for GQLSet_NodeLink {
    fn from(entries: Vec<NodeLink>) -> GQLSet_NodeLink { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<NodeLink> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_NodeLink;
#[Subscription]
impl SubscriptionShard_NodeLink {
    async fn nodeLinks<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodeLink, SubError>> + 'a {
        handle_generic_gql_collection_request::<NodeLink, GQLSet_NodeLink>(ctx, "nodeLinks", filter).await
    }
    async fn nodeLink<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodeLink>, SubError>> + 'a {
        handle_generic_gql_doc_request::<NodeLink>(ctx, "nodeLinks", id).await
    }
}

}