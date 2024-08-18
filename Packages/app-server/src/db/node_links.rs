use futures_util::{stream, Stream, TryFutureExt};
use rust_shared::anyhow::{anyhow, ensure, Error};
use rust_shared::async_graphql::{self, Enum};
use rust_shared::async_graphql::{Context, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use rust_shared::once_cell::sync::Lazy;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client, Row};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{serde_json, should_be_unreachable, to_anyhow, GQLError, SubError};

use crate::utils::db::accessors::get_db_entry;
use crate::utils::db::generic_handlers::queries::{handle_generic_gql_collection_query, handle_generic_gql_doc_query};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::{
	accessors::{get_db_entries, AccessorContext},
	filter::FilterInput,
	generic_handlers::subscriptions::{handle_generic_gql_collection_subscription, handle_generic_gql_doc_subscription, GQLSet},
};
use crate::utils::general::order_key::OrderKey;

use super::_shared::access_policy_target::AccessPolicyTarget;
use super::commands::_command::{CanNullOrOmit, CanOmit};
use super::nodes::get_node;
use super::nodes_::_node::Node;
use super::nodes_::_node_type::NodeType;

#[rustfmt::skip]
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
	ensure!(filter_map.len() > 0, "Must provide at least one of parent_id or child_id.");
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
			let parent_last_order_key = parent_child_links
				.into_iter()
				//.max_by_key(|a| a.orderKey).ok_or_else(should_be_unreachable)?.orderKey;
				.max_by(|a, b| a.orderKey.cmp(&b.orderKey))
				.ok_or_else(should_be_unreachable)?
				.orderKey;
			Ok(parent_last_order_key)
		},
	}
}

wrap_slow_macros! {

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash, Debug)]
pub enum ChildGroup {
	#[graphql(name = "generic")] generic,
	#[graphql(name = "truth")] truth,
	#[graphql(name = "relevance")] relevance,
	#[graphql(name = "comment")] comment,
	// testing
	#[graphql(name = "neutrality")] neutrality,
	#[graphql(name = "freeform")] freeform,
}

pub static CHILD_GROUPS_WITH_POLARITY_REQUIRED: Lazy<Vec<ChildGroup>> = Lazy::new(|| vec![ChildGroup::truth, ChildGroup::relevance, ChildGroup::neutrality]);
pub static CHILD_GROUPS_WITH_POLARITY_REQUIRED_OR_OPTIONAL: Lazy<Vec<ChildGroup>> = Lazy::new(|| vec![ChildGroup::truth, ChildGroup::relevance, ChildGroup::neutrality, ChildGroup::freeform]);

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
impl NodeLink {
	pub fn into_input(self, keep_parent_and_child: bool) -> NodeLinkInput {
		NodeLinkInput {
			parent: if keep_parent_and_child { Some(self.parent) } else { None },
			child: if keep_parent_and_child { Some(self.child) } else { None },
			group: self.group,
			orderKey: self.orderKey,
			form: self.form,
			seriesAnchor: self.seriesAnchor,
			seriesEnd: self.seriesEnd,
			polarity: self.polarity,
		}
	}
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

#[derive(InputObject, Serialize, Deserialize)]
pub struct NodeLinkUpdates {
	pub orderKey: CanOmit<OrderKey>,
	pub form: CanNullOrOmit<ClaimForm>,
	pub polarity: CanNullOrOmit<Polarity>,
}

#[derive(Clone)] pub struct GQLSet_NodeLink { pub nodes: Vec<NodeLink> }
#[Object] impl GQLSet_NodeLink { async fn nodes(&self) -> &Vec<NodeLink> { &self.nodes } }
impl GQLSet<NodeLink> for GQLSet_NodeLink {
	fn from(entries: Vec<NodeLink>) -> GQLSet_NodeLink { Self { nodes: entries } }
	fn nodes(&self) -> &Vec<NodeLink> { &self.nodes }
}

#[derive(Default)] pub struct QueryShard_NodeLink;
#[Object] impl QueryShard_NodeLink {
	async fn nodeLinks(&self, ctx: &Context<'_>, filter: Option<FilterInput>) -> Result<Vec<NodeLink>, GQLError> {
		handle_generic_gql_collection_query(ctx, "nodeLinks", filter).await
	}
	async fn nodeLink(&self, ctx: &Context<'_>, id: String) -> Result<Option<NodeLink>, GQLError> {
		handle_generic_gql_doc_query(ctx, "nodeLinks", id).await
	}
}

#[derive(Default)] pub struct SubscriptionShard_NodeLink;
#[Subscription] impl SubscriptionShard_NodeLink {
	async fn nodeLinks<'a>(&self, ctx: &'a Context<'_>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_NodeLink, SubError>> + 'a {
		handle_generic_gql_collection_subscription::<NodeLink, GQLSet_NodeLink>(ctx, "nodeLinks", filter, None).await
	}
	async fn nodeLink<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<NodeLink>, SubError>> + 'a {
		handle_generic_gql_doc_subscription::<NodeLink>(ctx, "nodeLinks", id).await
	}
}

}
