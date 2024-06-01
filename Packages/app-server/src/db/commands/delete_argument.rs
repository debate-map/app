use rust_shared::anyhow::{anyhow, Error};
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
use crate::db::general::permission_helpers::assert_user_can_delete;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::node_links::get_node_links;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};
use super::_shared::increment_edit_counts::increment_edit_counts_if_valid;
use super::delete_node::{delete_node, DeleteNodeInput};
use super::delete_node_link::{delete_node_link, DeleteNodeLinkInput};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_DeleteArgument;
#[Object] impl MutationShard_DeleteArgument {
	async fn delete_argument(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteArgumentInput, only_validate: Option<bool>) -> Result<DeleteArgumentResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_argument);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct DeleteArgumentInput {
	pub mapID: Option<String>,
	pub argumentID: String,
	pub claimID: String,
	pub deleteClaim: bool,
}

#[derive(SimpleObject, Debug)]
pub struct DeleteArgumentResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

// todo: eventually remove (or rework) this command, since unused
pub async fn delete_argument(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: DeleteArgumentInput, _extras: NoExtras) -> Result<DeleteArgumentResult, Error> {
	let DeleteArgumentInput { mapID, argumentID, claimID, deleteClaim } = input;

	if deleteClaim {
		delete_node(ctx, actor, false, DeleteNodeInput { mapID: None, nodeID: claimID }, Default::default()).await?;
	} else {
		let links = get_node_links(ctx, Some(&argumentID), Some(&claimID)).await?;
		for link in links {
			delete_node_link(ctx, actor, false, DeleteNodeLinkInput { mapID: None, id: link.id.to_string() }, Default::default()).await?;
		}
	}

	//delete_node(ctx, actor, DeleteNodeInput { mapID: None, nodeID: argumentID }, DeleteNodeExtras { childrenToIgnore: vec![claimID] }).await?;
	delete_node(ctx, actor, false, DeleteNodeInput { mapID: None, nodeID: argumentID }, Default::default()).await?;

	increment_edit_counts_if_valid(&ctx, Some(actor), mapID, is_root).await?;

	Ok(DeleteArgumentResult { __: gql_placeholder() })
}
