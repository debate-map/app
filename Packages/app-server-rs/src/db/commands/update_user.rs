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
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable, command_boilerplate};
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_update, assert_user_can_update_simple, is_user_admin};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::users::{User, get_user, UserUpdates};
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_UpdateUser;
#[Object] impl MutationShard_UpdateUser {
	async fn update_user(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateUserInput, only_validate: Option<bool>) -> Result<UpdateUserResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_user);
    }
}

#[derive(InputObject, Deserialize)]
pub struct UpdateUserInput {
	pub id: String,
	pub updates: UserUpdates,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateUserResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_user(ctx: &AccessorContext<'_>, actor: &User, input: UpdateUserInput, _extras: NoExtras) -> Result<UpdateUserResult, Error> {
	let UpdateUserInput { id, updates } = input;
	let result = UpdateUserResult { __: gql_placeholder() };
	
	let old_data = get_user(&ctx, &id).await?;

	// permission-checks differ per field, so check each field individually
	if let Some(_new_display_name) = updates.displayName.clone() {
		ensure!(id == actor.id.to_string() || is_user_admin(actor), "Only admins can change the display-name of another user!");
	}
	if let Some(new_permission_groups) = updates.permissionGroups.clone() {
		let admin = actor.permissionGroups.admin;
		ensure!(admin, "Only admins can modify the permission-groups of a user.");
		
		let changing_own_admin_state = id == actor.id.to_string() && new_permission_groups.admin != old_data.permissionGroups.admin;
		ensure!(!changing_own_admin_state, "Even an admin cannot change their own account's admin-state. (to prevent accidental, permanent self-demotion)");
	}

	let new_data = User {
		displayName: update_field(updates.displayName, old_data.displayName),
		permissionGroups: update_field(updates.permissionGroups, old_data.permissionGroups),
		..old_data
	};

	set_db_entry_by_id_for_struct(&ctx, "users".to_owned(), id.to_string(), new_data).await?;

	Ok(result)
}