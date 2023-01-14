use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError, to_anyhow};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, command_boilerplate};
use crate::db::commands::_shared::increment_map_edits::{increment_map_edits, increment_map_edits_if_valid};
use crate::db::commands::delete_node::{DeleteNodeInput, delete_node};
use crate::db::general::permission_helpers::{assert_user_can_delete, is_user_creator_or_mod};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::maps::{Map, get_map};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};
use super::delete_node::DeleteNodeExtras;

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_DeleteMap;
#[Object] impl MutationShard_DeleteMap {
	async fn delete_map(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteMapInput, only_validate: Option<bool>) -> Result<DeleteMapResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_map);
    }
}

#[derive(InputObject, Deserialize)]
pub struct DeleteMapInput {
	pub id: String,
}

#[derive(SimpleObject, Debug)]
pub struct DeleteMapResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn delete_map(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: DeleteMapInput, _extras: NoExtras) -> Result<DeleteMapResult, Error> {
	let DeleteMapInput { id } = input;
	
	let old_data = get_map(ctx, &id).await?;
	assert_user_can_delete(ctx, actor, &old_data).await?;

	// first delete the root-node
	delete_node(ctx, actor, false, DeleteNodeInput { mapID: None, nodeID: old_data.rootNode }, DeleteNodeExtras { as_part_of_map_delete: true }).await?;

	delete_db_entry_by_id(ctx, "maps".to_owned(), id.to_string()).await?;

	Ok(DeleteMapResult { __: gql_placeholder() })
}