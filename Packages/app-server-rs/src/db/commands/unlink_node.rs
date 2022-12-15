use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::utils::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, ensure};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, command_boilerplate};
use crate::db::commands::_shared::increment_map_edits::increment_map_edits_if_valid;
use crate::db::general::permission_helpers::{assert_user_can_delete, is_user_creator_or_mod};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_child_links::get_node_child_links;
use crate::db::nodes::{get_node, is_root_node};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};
use super::delete_node::{delete_node, DeleteNodeInput};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_UnlinkNode;
#[Object] impl MutationShard_UnlinkNode {
	async fn unlink_node(&self, gql_ctx: &async_graphql::Context<'_>, input: UnlinkNodeInput) -> Result<UnlinkNodeResult, GQLError> {
		command_boilerplate!(gql_ctx, input, unlink_node);
    }
}

#[derive(InputObject, Deserialize)]
pub struct UnlinkNodeInput {
	pub mapID: Option<String>,
	pub parentID: String,
	pub childID: String,
}

#[derive(SimpleObject, Debug)]
pub struct UnlinkNodeResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

#[derive(Default)]
pub struct UnlinkNodeExtras {
	pub allow_orphaning: bool,
}

pub async fn unlink_node(ctx: &AccessorContext<'_>, user_info: &User, input: UnlinkNodeInput, extras: UnlinkNodeExtras) -> Result<UnlinkNodeResult, Error> {
	let UnlinkNodeInput { mapID, parentID, childID } = input;
	let result = UnlinkNodeResult { __: gql_placeholder() };
	
	let child_number_of_parents = get_node_child_links(ctx, None, Some(&childID)).await?.len();
	let parent_to_child_links = get_node_child_links(ctx, Some(&parentID), Some(&childID)).await?;
	ensure!(parent_to_child_links.len() == 1, "There should be 1 and only 1 link between parent and child. Link count:{}", parent_to_child_links.len());

	let old_data = get_node(ctx, &childID).await?;

	let base_text = format!("Cannot unlink node #{}, since ", old_data.id.as_str());
	ensure!(is_user_creator_or_mod(user_info, old_data.creator.as_str()), "{base_text}you are not its owner. (or a mod)");
	ensure!(extras.allow_orphaning || child_number_of_parents > 1, "{base_text}doing so would orphan it. Try deleting it instead.");
	ensure!(!is_root_node(ctx, &old_data).await?, "{base_text}it's the root-node of a map.");
	//ensure!(!IsNodeSubnode(oldData), "{baseText}it's a subnode. Try deleting it instead.");

	for link in parent_to_child_links {
		delete_db_entry_by_id(ctx, "nodeChildLinks".to_owned(), link.id.to_string()).await?;
	}

	increment_map_edits_if_valid(&ctx, mapID).await?;

	Ok(result)
}