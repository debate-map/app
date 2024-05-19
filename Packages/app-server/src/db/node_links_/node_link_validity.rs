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
use crate::db::node_links::{get_node_links, ChildGroup, NodeLink, NodeLinkInput, Polarity, CHILD_GROUPS_WITH_POLARITY_REQUIRED_OR_OPTIONAL, CHILD_GROUPS_WITH_POLARITY_REQUIRED};
use crate::db::nodes::get_node;
use crate::db::nodes_::_node::{Node};
use crate::db::nodes_::_node_type::{get_node_type_info, NodeType};
use crate::db::users::{User, PermissionGroups, get_user};
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

/// Does basic checking of validity of parent<>child linkage. See `assert_new_link_is_valid` for a more thorough validation.
// sync: js[CheckLinkIsValid]
pub fn assert_link_is_valid(parent_type: NodeType, child_type: NodeType, child_group: ChildGroup, link_polarity: Option<Polarity>) -> Result<(), Error> {
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
		let is_sl_simple_arg = parent_type == NodeType::claim && child_type == NodeType::claim && child_group == ChildGroup::truth && link_polarity.is_some();
		if !is_sl_simple_arg && CHILD_GROUPS_WITH_POLARITY_REQUIRED.contains(&child_group) && child_type != NodeType::argument {
			bail!("Where child-group is {child_group:?}, an argument child is expected (instead it's a {child_type:?}).");
		}

		// give generic message
		bail!("The child's type ({child_type:?}) is not valid here. (parent type: {parent_type:?}, child group: ${child_group:?})");
	}

	if CHILD_GROUPS_WITH_POLARITY_REQUIRED.contains(&child_group) {
		ensure!(link_polarity.is_some(), r#"A link in group "truth", "relevance", or "neutrality" must have a polarity specified."#);
	}
	if child_type == NodeType::argument {
		ensure!(link_polarity.is_some(), "A link with an argument child must have a polarity specified.");
	}
	if link_polarity.is_some() {
        ensure!(CHILD_GROUPS_WITH_POLARITY_REQUIRED_OR_OPTIONAL.contains(&child_group), r#"Only links in child-groups "truth", "relevance", "neutrality", or "freeform" can have a polarity specified."#);
		ensure!(child_type == NodeType::argument || child_type == NodeType::claim, "Only links with an argument child (or claim child, in sl-mode) can have a polarity specified.");
	}

	Ok(())
}

/// Extension of `assert_link_is_valid`, with additional checking based on knowledge of specific nodes being linked, user's permissions, etc.
/// For example:
/// * Blocks if node is being linked as child of itself.
/// * Blocks if adding child to global-root, without user being an admin.
// sync: js[CheckNewLinkIsValid]
pub async fn assert_new_link_is_valid(ctx: &AccessorContext<'_>, parent_id: &str, new_child_id: &str, new_child_type: NodeType, new_child_group: ChildGroup, new_link_polarity: Option<Polarity>, actor: Option<&User>) -> Result<(), Error> {
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

	assert_link_is_valid(parent.r#type, new_child_type, new_child_group, new_link_polarity)
}