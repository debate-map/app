use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::{SYSTEM_USER_ID, GLOBAL_ROOT_NODE_ID};
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, ensure, bail, Context};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::info;

use crate::db::_shared::access_policy_target::AccessPolicyTarget;
use crate::db::_shared::common_errors::err_should_be_populated;
use crate::db::_shared::table_permissions::{does_policy_allow_x, CanVote, CanAddChild};
use crate::db::access_policies::get_access_policy;
use crate::db::access_policies_::_permission_set::{APAction, APTable};
use crate::db::commands::_command::command_boilerplate;
use crate::db::general::permission_helpers::assert_user_can_add_child;
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_links::{NodeLink, NodeLinkInput, get_node_links, ChildGroup};
use crate::db::nodes::get_node;
use crate::db::nodes_::_node::{Node};
use crate::db::nodes_::_node_type::{get_node_type_info, NodeType};
use crate::db::users::{User, PermissionGroups, get_user};
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_AddNodeLink;
#[Object] impl MutationShard_AddNodeLink {
	/// This is a low-level function; for many use-cases, the higher-level `linkNode` command is preferred.
	async fn add_node_link(&self, gql_ctx: &async_graphql::Context<'_>, input: AddNodeLinkInput, only_validate: Option<bool>) -> Result<AddNodeLinkResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_node_link);
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddNodeLinkInput {
	pub link: NodeLinkInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddNodeLinkResult {
	pub id: String,
}

}

pub async fn add_node_link(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddNodeLinkInput, _extras: NoExtras) -> Result<AddNodeLinkResult, Error> {
	let AddNodeLinkInput { link: link_ } = input;
	
	let parent_id = link_.parent.ok_or(err_should_be_populated("link.parent"))?;
	let child_id = link_.child.ok_or(err_should_be_populated("link.child"))?;
	let parent = get_node(&ctx, &parent_id).await?;
	let child = get_node(&ctx, &child_id).await?;

	assert_user_can_add_child(ctx, actor, &parent).await?; // defensive (tbh, maybe *too* defensive, ie. clearly redundant)

	let link = NodeLink {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		parent: parent_id.clone(),
		child: child_id,
		c_parentType: parent.r#type,
		c_childType: child.r#type,
		// pass-through
		group: link_.group,
		orderKey: link_.orderKey,
		form: link_.form,
		seriesAnchor: link_.seriesAnchor,
		seriesEnd: link_.seriesEnd,
		polarity: link_.polarity,
		c_accessPolicyTargets: vec![], // auto-set by db
	};

	// validations
	{
		/*let parent_to_child_links = get_node_links(ctx, Some(&parent_id), Some(&child_id)).await?;
		ensure!(parent_to_child_links.len() == 0, "Node #{child_id} is already a child of node #{parent_id}.");*/

		assert_new_link_is_valid(ctx, &parent_id, link.group, &link.child, link.c_childType, Some(actor)).await?;

		if child.r#type == NodeType::argument {
			ensure!(link.polarity.is_some(), "An argument node must have its polarity specified in its parent-link.");
		} else {
			ensure!(link.polarity.is_none(), "Only argument nodes should have a polarity value specified in its parent-link.");
		}
	}
	
	upsert_db_entry_by_id_for_struct(&ctx, "nodeLinks".to_owned(), link.id.to_string(), link.clone()).await?;

	Ok(AddNodeLinkResult { id: link.id.to_string() })
}

/// Does basic checking of validity of parent<>child linkage. See `assert_new_link_is_valid` for a more thorough validation.
// sync: js[CheckLinkIsValid]
pub fn assert_link_is_valid(parent_type: NodeType, child_group: ChildGroup, child_type: NodeType) -> Result<(), Error> {
	// redundant check, improving error-message clarity for certain issues
	if !get_node_type_info(parent_type).childGroup_childTypes.contains_key(&child_group) {
		bail!("Where parent's type is {parent_type:?}, no \"{child_group:?}\" child-group exists.");
	}

	let valid_child_types = get_node_type_info(parent_type).childGroup_childTypes.get(&child_group).cloned().unwrap_or(vec![]);
	if !valid_child_types.contains(&child_type) {
		// redundant checks, improving error-message clarity for certain issues
		if parent_type == NodeType::argument && child_group == ChildGroup::generic && child_type != NodeType::claim {
			bail!("Where parent is an argument, and child-group is generic, a claim child is expected (instead it's a {child_type:?}).");
		}
		if vec![ChildGroup::truth, ChildGroup::relevance, ChildGroup::neutrality].contains(&child_group) && child_type != NodeType::argument {
			bail!("Where child-group is {child_group:?}, an argument child is expected (instead it's a {child_type:?}).");
		}

		// give generic message
		bail!("The child's type ({child_type:?}) is not valid here. (parent type: {parent_type:?}, child group: ${child_group:?})");
	}

	Ok(())
}

/// Extension of `assert_link_is_valid`, with additional checking based on knowledge of specific nodes being linked, user's permissions, etc.
/// For example:
/// * Blocks if node is being linked as child of itself.
/// * Blocks if adding child to global-root, without user being an admin.
// sync: js[CheckNewLinkIsValid]
pub async fn assert_new_link_is_valid(ctx: &AccessorContext<'_>, parent_id: &str, new_child_group: ChildGroup, new_child_id: &str, new_child_type: NodeType, actor: Option<&User>) -> Result<(), Error> {
	// client-side version
	/*let permissions = if let Some(actor) = actor { actor.permissionGroups } else { PermissionGroups::all_false() };
	if !can_get_basic_permissions(actor, permissions) { bail!("You're not signed in, or lack basic permissions."); }*/
	// server-side version (on server, no need for this call-path to be called without actor)
	let (actor, permissions) = match actor {
		Some(actor) => (actor, &actor.permissionGroups),
		None => bail!("You're not signed in."),
	};
	if !permissions.basic { bail!("You lack basic permissions."); }
	
	let parent = get_node(ctx, parent_id).await.with_context(|| "Parent data not found")?;
	// client-side version
	//if !does_policy_allow_x(ctx, actor_id, &parent.accessPolicy, APTable::nodes, APAction::addChild).await? { bail!("Parent node's permission policy does not grant you the ability to add children."); }
	/*let guessedCanAddChild = match actor {
		Some(actor) => parent.can_add_child(ctx, actor).await?, // if can add child
		None => does_policy_allow_x(ctx, None, &parent.accessPolicy, APTable::nodes, APAction::addChild).await?, // or probably can
	};
	if !guessedCanAddChild { bail!("Parent node's permission policy does not grant you the ability to add children."); }*/
	// server-side version (on server, no need for this call-path to be called without actor)
	if !parent.can_add_child(ctx, actor).await? { bail!("Parent node's permission policy does not grant you the ability to add children."); }

	if parent.id == GLOBAL_ROOT_NODE_ID && !permissions.admin { bail!("Only admins can add children to the global-root."); }
	if parent.id == new_child_id { bail!("Cannot link node as its own child."); }

	let is_already_child = get_node_links(ctx, Some(parent_id), Some(&new_child_id)).await?.len() > 0;
	if is_already_child { bail!("Node is already a child of the parent."); }

	assert_link_is_valid(parent.r#type, new_child_group, new_child_type)
}