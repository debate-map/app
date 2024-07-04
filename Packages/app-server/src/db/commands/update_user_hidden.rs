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
use crate::db::commands::_command::{command_boilerplate, delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable};
use crate::db::general::permission_helpers::assert_user_can_modify;
use crate::db::user_hiddens::{get_user_hidden, user_hidden_extras_locked_subfields, UserHidden, UserHiddenUpdates};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{update_field_of_extras, upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_UpdateUserHidden;
#[Object] impl MutationShard_UpdateUserHidden {
	async fn update_user_hidden(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateUserHiddenInput, only_validate: Option<bool>) -> Result<UpdateUserHiddenResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_user_hidden);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct UpdateUserHiddenInput {
	pub id: String,
	pub updates: UserHiddenUpdates,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateUserHiddenResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_user_hidden(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: UpdateUserHiddenInput, _extras: NoExtras) -> Result<UpdateUserHiddenResult, Error> {
	let UpdateUserHiddenInput { id, updates } = input;

	let old_data = get_user_hidden(&ctx, &id).await?;
	assert_user_can_modify(ctx, actor, &old_data).await?;

	let new_data = UserHidden {
		backgroundID: update_field_nullable(updates.backgroundID, old_data.backgroundID),
		backgroundCustom_enabled: update_field_nullable(updates.backgroundCustom_enabled, old_data.backgroundCustom_enabled),
		backgroundCustom_color: update_field_nullable(updates.backgroundCustom_color, old_data.backgroundCustom_color),
		backgroundCustom_url: update_field_nullable(updates.backgroundCustom_url, old_data.backgroundCustom_url),
		backgroundCustom_position: update_field_nullable(updates.backgroundCustom_position, old_data.backgroundCustom_position),
		addToStream: update_field(updates.addToStream, old_data.addToStream),
		notificationPolicy: update_field(updates.notificationPolicy, old_data.notificationPolicy),
		extras: update_field_of_extras(updates.extras, old_data.extras, user_hidden_extras_locked_subfields())?,
		..old_data
	};

	upsert_db_entry_by_id_for_struct(&ctx, "userHiddens".to_owned(), id.to_string(), new_data).await?;

	Ok(UpdateUserHiddenResult { __: gql_placeholder() })
}
