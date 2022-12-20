use futures_util::future::join_all;
use indexmap::IndexMap;
use rust_shared::anyhow::{Error, anyhow, bail};
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

use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::FilterInput, accessors::{AccessorContext, get_db_entry}}};

use super::general::permission_helpers::{assert_user_can_delete, is_user_creator_or_mod};
use super::node_child_links::get_node_child_links;
use super::nodes_::_node::{Node};
use super::nodes_::_node_type::NodeType;
use super::users::User;

wrap_slow_macros!{

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

pub async fn get_node(ctx: &AccessorContext<'_>, id: &str) -> Result<Node, Error> {
    get_db_entry(ctx, "nodes", &Some(json!({
        "id": {"equalTo": id}
    }))).await
}

/// Does not include mirror-children atm.
pub async fn get_node_children(ctx: &AccessorContext<'_>, node_id: &str) -> Result<Vec<Node>, Error> {
	let child_links = get_node_child_links(ctx, Some(node_id), None).await?;
	//let result = child_links.iter().map(|link| get_node(ctx, &link.child).await?);
	let mut result = vec![];
	for link in child_links {
		result.push(get_node(ctx, &link.child).await?);
	}
	Ok(result)
}

/// Does not include mirror-parents.
pub async fn get_node_parents(ctx: &AccessorContext<'_>, node_id: &str) -> Result<Vec<Node>, Error> {
	let child_links = get_node_child_links(ctx, None, Some(node_id)).await?;
	//let result = child_links.iter().map(|link| get_node(ctx, &link.parent).await?);
	let mut result = vec![];
	for link in child_links {
		result.push(get_node(ctx, &link.parent).await?);
	}
	Ok(result)
}

// sync:js
pub async fn is_root_node(ctx: &AccessorContext<'_>, node: &Node) -> Result<bool, Error> {
	if node.r#type != NodeType::category { return Ok(false); }
	let parents = get_node_child_links(ctx, None, Some(node.id.as_str())).await?;
	if parents.len() != 0 { return Ok(false); } // todo: probably change this (map root-nodes can have "parents" now I think, due to restructuring)
	Ok(true)
}

// sync:js[CheckUserCanDeleteNode]
pub async fn assert_user_can_delete_node(ctx: &AccessorContext<'_>, actor: &User, node: &Node, as_part_of_map_delete: bool, parents_to_ignore: Vec<String>, children_to_ignore: Vec<String>) -> Result<(), Error> {
	// first check generic delete permissions
	//assert_user_can_delete(&ctx, &actor, &node.creator, &node.accessPolicy).await?;
	
	let base_text = format!("Cannot delete node #{}, since ", node.id.as_str());
	if !is_user_creator_or_mod(actor, &node.creator) {
		bail!("{base_text}you are not the owner of this node. (or a mod)");
	}
	let parent_links = get_node_child_links(ctx, None, Some(node.id.as_str())).await?;
	if parent_links.into_iter().map(|a| a.parent).filter(|a| !parents_to_ignore.contains(a)).collect::<Vec<String>>().len() > 1 {
		bail!("{base_text}it has more than one parent. Try unlinking it instead.");
	}
	if is_root_node(ctx, &node).await? && !as_part_of_map_delete {
		bail!("{base_text}it's the root-node of a map.");
	}

	/*let node_children = get_node_children(ctx, node.id.as_str()).await?;
	if node_children.iter().map(|a| a.id).Exclude(children_to_ignore).len() {*/
	let child_links = get_node_child_links(ctx, Some(node.id.as_str()), None).await?;
	if child_links.into_iter().map(|a| a.child).filter(|a| !children_to_ignore.contains(a)).next().is_some() {
		bail!("Cannot delete this node (#{}) until all its children have been unlinked or deleted.", node.id.as_str());
	}
	return Ok(());
}