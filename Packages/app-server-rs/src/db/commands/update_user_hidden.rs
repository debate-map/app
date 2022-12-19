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
use crate::db::user_hiddens::{UserHidden, get_user_hidden, UserHiddenUpdates};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_UpdateUserHidden;
#[Object] impl MutationShard_UpdateUserHidden {
	async fn update_user_hidden(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateUserHiddenInput, only_validate: Option<bool>) -> Result<UpdateUserHiddenResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_user_hidden);
    }
}

#[derive(InputObject, Deserialize)]
pub struct UpdateUserHiddenInput {
	pub id: String,
	pub updates: UserHiddenUpdates,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateUserHiddenResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_user_hidden(ctx: &AccessorContext<'_>, actor: &User, input: UpdateUserHiddenInput, _extras: NoExtras) -> Result<UpdateUserHiddenResult, Error> {
	let UpdateUserHiddenInput { id, updates } = input;
	let result = UpdateUserHiddenResult { __: gql_placeholder() };
	
	let old_data = get_user_hidden(&ctx, &id).await?;
	ensure!(id == actor.id.to_string(), "Cannot change the user-hidden-data of another user!");

	let new_data = UserHidden {
		backgroundID: update_field_nullable(updates.backgroundID, old_data.backgroundID),
		backgroundCustom_enabled: update_field_nullable(updates.backgroundCustom_enabled, old_data.backgroundCustom_enabled),
		backgroundCustom_color: update_field_nullable(updates.backgroundCustom_color, old_data.backgroundCustom_color),
		backgroundCustom_url: update_field_nullable(updates.backgroundCustom_url, old_data.backgroundCustom_url),
		backgroundCustom_position: update_field_nullable(updates.backgroundCustom_position, old_data.backgroundCustom_position),
		addToStream: update_field(updates.addToStream, old_data.addToStream),
		..old_data
	};

	set_db_entry_by_id_for_struct(&ctx, "userHiddens".to_owned(), id.to_string(), new_data).await?;

	Ok(result)
}