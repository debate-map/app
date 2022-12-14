use rust_shared::anyhow::{Error, anyhow};
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
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};

use super::general::permission_helpers::{assert_user_can_delete, is_user_creator_or_mod};
use super::node_child_links::get_node_child_links;
use super::users::User;

pub async fn get_node(ctx: &AccessorContext<'_>, id: &str) -> Result<Node, Error> {
    get_db_entry(ctx, "nodes", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

// sync:js
pub async fn is_root_node(ctx: &AccessorContext<'_>, node: &Node) -> Result<bool, Error> {
	if node.r#type != NodeType::category { return Ok(false); }
	let parents = get_node_child_links(ctx, None, Some(node.id.as_str())).await?;
	if parents.len() != 0 { return Ok(false); } // todo: probably change this (map root-nodes can have "parents" now I think, due to restructuring)
	Ok(true)
}

// sync:js
pub async fn assert_user_can_delete_node(ctx: &AccessorContext<'_>, user_info: &User, node: &Node, as_part_of_map_delete: bool, parents_to_ignore: Vec<String>, children_to_ignore: Vec<String>) -> Result<(), Error> {
	// first check generic delete permissions
	//assert_user_can_delete(&ctx, &user_info, &node.creator, &node.accessPolicy).await?;
	
	let base_text = format!("Cannot delete node #{}, since ", node.id.as_str());
	if !is_user_creator_or_mod(user_info, &node.creator) {
		return Err(anyhow!("{base_text}you are not the owner of this node. (or a mod)"));
	}
	let parent_links = get_node_child_links(ctx, None, Some(node.id.as_str())).await?;
	if parent_links.into_iter().map(|a| a.parent).filter(|a| !parents_to_ignore.contains(a)).collect::<Vec<String>>().len() > 1 {
		return Err(anyhow!("{base_text}it has more than one parent. Try unlinking it instead."));
	}
	if is_root_node(ctx, &node).await? && !as_part_of_map_delete {
		return Err(anyhow!("{base_text}it's the root-node of a map."));
	}

	/*let node_children = get_node_children(ctx, node.id.as_str()).await?;
	if node_children.iter().map(|a| a.id).Exclude(children_to_ignore).len() {*/
	let child_links = get_node_child_links(ctx, Some(node.id.as_str()), None).await?;
	if child_links.into_iter().map(|a| a.child).filter(|a| !children_to_ignore.contains(a)).next().is_some() {
		return Err(anyhow!("Cannot delete this node (#{}) until all its children have been unlinked or deleted.", node.id.as_str()));
	}
	return Ok(());
}

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub enum NodeType {
    #[graphql(name = "category")] category,
    #[graphql(name = "package")] package,
    #[graphql(name = "multiChoiceQuestion")] multiChoiceQuestion,
    #[graphql(name = "claim")] claim,
    #[graphql(name = "argument")] argument,
}

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: ID,
	pub creator: String,
	pub createdAt: i64,
    pub r#type: NodeType,
	pub rootNodeForMap: Option<String>,
    #[graphql(name = "c_currentRevision")]
	//pub c_currentRevision: Option<String>,
	pub c_currentRevision: String,
	pub accessPolicy: String,
	pub multiPremiseArgument: Option<bool>,
	pub argumentType: Option<String>,
	pub extras: serde_json::Value,
}
impl From<Row> for Node {
    fn from(row: Row) -> Self { postgres_row_to_struct(row).unwrap() }
}

#[derive(Clone)] pub struct GQLSet_Node { nodes: Vec<Node> }
#[Object] impl GQLSet_Node { async fn nodes(&self) -> &Vec<Node> { &self.nodes } }
impl GQLSet<Node> for GQLSet_Node {
    fn from(entries: Vec<Node>) -> GQLSet_Node { Self { nodes: entries } }
    fn nodes(&self) -> &Vec<Node> { &self.nodes }
}

#[derive(Default)]
pub struct SubscriptionShard_Node;
#[Subscription]
impl SubscriptionShard_Node {
    async fn nodes<'a>(&self, ctx: &'a Context<'_>, _id: Option<String>, filter: Option<FilterInput>) -> impl Stream<Item = Result<GQLSet_Node, SubError>> + 'a {
        handle_generic_gql_collection_request::<Node, GQLSet_Node>(ctx, "nodes", filter).await
    }
    async fn node<'a>(&self, ctx: &'a Context<'_>, id: String) -> impl Stream<Item = Result<Option<Node>, SubError>> + 'a {
        handle_generic_gql_doc_request::<Node>(ctx, "nodes", id).await
    }
}

}