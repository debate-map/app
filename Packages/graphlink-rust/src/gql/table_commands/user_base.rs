use crate::anyhow::{anyhow, ensure, Error};
use crate::async_graphql::Object;
use crate::async_graphql::{InputObject, SimpleObject, ID};
use crate::gql::table_commands::_command::command_boilerplate;
use crate::rust_macros::wrap_slow_macros;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::{json, Value};
use crate::tracing::info;
use crate::utils::errors::errors::GQLError;
use crate::utils::general::type_aliases::JSONValue;
use crate::{access_fail_msg, new_uuid_v4_as_b64};
use crate::{anyhow, async_graphql, can_actor_access_entry_struct, serde_json};
use crate::{delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable};
use crate::{get_user, User, UserUpdates};
use crate::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::{is_user_admin, modify_fail_msg};
use crate::{AccessorContext, GenericResponse};

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_UserBase;
#[Object] impl MutationShard_UserBase {
	async fn update_user(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateUserInput, only_validate: Option<bool>) -> Result<GenericResponse, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_user);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct UpdateUserInput {
	pub id: String,
	pub updates: UserUpdates,
}

}

pub async fn update_user(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: UpdateUserInput, _extras: NoExtras) -> Result<GenericResponse, Error> {
	let UpdateUserInput { id, updates } = input;

	let old_data = get_user(&ctx, &id).await.map_err(|_| Error::msg(access_fail_msg()))?;
	ensure!(can_actor_access_entry_struct(&old_data, "users", actor), access_fail_msg()); // defensive
	ensure!(*actor.id == id || is_user_admin(actor), modify_fail_msg());

	// in addition to general check above, do some additional checks on individual field-changes (some permission-checks apply only to certain fields)
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

	upsert_db_entry_by_id_for_struct(&ctx, "users".to_owned(), id.to_string(), new_data).await?;

	Ok(GenericResponse::new())
}
