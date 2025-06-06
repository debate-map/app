use rust_shared::anyhow::{anyhow, bail, ensure, Context, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::{GLOBAL_ROOT_NODE_ID, SYSTEM_USER_ID};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use tracing::info;

use crate::db::_shared::access_policy_target::AccessPolicyTarget;
use crate::db::_shared::common_errors::err_should_be_populated;
use crate::db::_shared::table_permissions::{does_policy_allow_x, CanAddChild, CanVote};
use crate::db::access_policies::get_access_policy;
use crate::db::access_policies_::_permission_set::{APAction, APTable};
use crate::db::commands::_command::command_boilerplate;
use crate::db::general::permission_helpers::assert_user_can_add_child;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::node_links::{get_node_links, ChildGroup, NodeLink, NodeLinkInput, Polarity};
use crate::db::node_links_::node_link_validity::assert_new_link_is_valid;
use crate::db::node_phrasings::get_first_non_empty_text_in_phrasing_embedded;
use crate::db::node_revisions::get_node_revision;
use crate::db::nodes::get_node;
use crate::db::nodes_::_node::Node;
use crate::db::nodes_::_node_type::{get_node_type_info, NodeType};
use crate::db::users::{get_user, PermissionGroups, User};
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

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

		if let Err(err) = assert_new_link_is_valid(ctx, &parent_id, &link.child, link.c_childType, link.group, link.polarity, Some(actor)).await {
			let parent_text = get_first_non_empty_text_in_phrasing_embedded(&get_node_revision(ctx, &parent.c_currentRevision).await?.phrasing);
			let child_text = get_first_non_empty_text_in_phrasing_embedded(&get_node_revision(ctx, &child.c_currentRevision).await?.phrasing);
			let link_json = serde_json::to_string(&link).unwrap_or_else(|_| "<failed to serialize link>".o());
			return Err(err.context(format!("New link is invalid. @parent_text({parent_text:?}) @childText({child_text:?}) @link({link_json})")).into());
		}
	}

	upsert_db_entry_by_id_for_struct(&ctx, "nodeLinks".to_owned(), link.id.to_string(), link.clone()).await?;

	Ok(AddNodeLinkResult { id: link.id.to_string() })
}
