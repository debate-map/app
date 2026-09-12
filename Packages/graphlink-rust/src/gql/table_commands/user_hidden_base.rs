use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};
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
use crate::{access_fail_msg, modify_fail_msg, new_uuid_v4_as_b64};
use crate::{anyhow, async_graphql, can_actor_access_entry_struct, serde_json};
use crate::{delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable};
use crate::{get_user_hidden, UserHidden, UserHiddenUpdates};
use crate::{update_field_of_extras_new, AccessorContext};
use crate::{GenericResponse, User};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_UserHiddenBase;
#[Object] impl MutationShard_UserHiddenBase {
	async fn update_user_hidden(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateUserHiddenInput, only_validate: Option<bool>) -> Result<GenericResponse, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_user_hidden);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct UpdateUserHiddenInput {
	pub id: String,
	pub updates: UserHiddenUpdates,
}

}

pub async fn update_user_hidden(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: UpdateUserHiddenInput, _extras: NoExtras) -> Result<GenericResponse, Error> {
	let UpdateUserHiddenInput { id, updates } = input;

	let old_data = get_user_hidden(&ctx, &id).await.map_err(|_| Error::msg(access_fail_msg()))?;
	ensure!(can_actor_access_entry_struct(&old_data, "user_hiddens", actor), access_fail_msg()); // defensive
	ensure!(*actor.id == id, modify_fail_msg());

	let new_data = UserHidden { extras: update_field_of_extras_new(updates.extras, old_data.extras, vec![])?, ..old_data };

	upsert_db_entry_by_id_for_struct(&ctx, "user_hiddens".to_owned(), id.to_string(), new_data).await?;

	Ok(GenericResponse::new())
}
