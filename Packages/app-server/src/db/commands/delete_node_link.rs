use rust_shared::anyhow::{anyhow, ensure, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use tracing::info;

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{command_boilerplate, delete_db_entry_by_id, gql_placeholder};
use crate::db::commands::_shared::increment_edits::increment_edits_if_valid;
use crate::db::general::permission_helpers::{assert_user_can_delete, is_user_creator_or_mod};
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::node_links::{get_node_link, get_node_links};
use crate::db::nodes::{get_node, is_root_node};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};
use super::delete_node::{delete_node, DeleteNodeInput};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_DeleteNodeLink;
#[Object] impl MutationShard_DeleteNodeLink {
	async fn delete_node_link(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteNodeLinkInput, only_validate: Option<bool>) -> Result<DeleteNodeLinkResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_node_link);
	}
}

#[derive(InputObject, Serialize, Deserialize, Clone)]
pub struct DeleteNodeLinkInput {
	pub mapID: Option<String>,
	pub id: String,
	pub incrementEdits: Option<bool>,
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct DeleteNodeLinkResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

/*#[derive(Default)]
pub struct DeleteNodeLinkExtras {
	pub allow_orphaning: bool,
}*/

pub async fn delete_node_link(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: DeleteNodeLinkInput, _extras: NoExtras) -> Result<DeleteNodeLinkResult, Error> {
	let DeleteNodeLinkInput { mapID, id, incrementEdits } = input;

	/*let child_number_of_parents = get_node_links(ctx, None, Some(&childID)).await?.len();
	let parent_to_child_links = get_node_links(ctx, Some(&parentID), Some(&childID)).await?;
	ensure!(parent_to_child_links.len() == 1, "There should be 1 and only 1 link between parent and child. Link count:{}", parent_to_child_links.len());*/

	let link = get_node_link(ctx, &id).await?;
	let child_id = &link.child;
	let base_text = format!("Cannot unlink node #{}, since ", child_id);

	// checks on link
	assert_user_can_delete(ctx, actor, &link).await?;

	// checks on parent/child nodes
	let child_node = get_node(ctx, child_id).await?;
	let child_number_of_parents = get_node_links(ctx, None, Some(child_id)).await?.len();
	//ensure!(is_user_creator_or_mod(actor, node.creator.as_str()), "{base_text}you are not its owner. (or a mod)");
	ensure!(/*extras.allow_orphaning ||*/ child_number_of_parents > 1, "{base_text}doing so would orphan it. Try deleting it instead.");
	ensure!(!is_root_node(ctx, &child_node).await?, "{base_text}it's the root-node of a map.");
	//ensure!(!IsNodeSubnode(oldData), "{baseText}it's a subnode. Try deleting it instead.");

	/*for link in parent_to_child_links {
		delete_db_entry_by_id(ctx, "nodeLinks".to_owned(), link.id.to_string()).await?;
	}*/
	delete_db_entry_by_id(ctx, "nodeLinks".to_owned(), link.id.to_string()).await?;

	increment_edits_if_valid(&ctx, Some(actor), mapID, is_root, incrementEdits).await?;

	Ok(DeleteNodeLinkResult { __: gql_placeholder() })
}
