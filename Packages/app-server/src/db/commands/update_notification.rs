use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, ensure};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::info;

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable, command_boilerplate};
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_modify, is_user_creator_or_mod, is_user_mod};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::notifications::{Notification, NotificationUpdateReadInput, get_notification};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_UpdateNotification;
#[Object] impl MutationShard_UpdateNotification {
	async fn update_notification(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateNotificationInput, only_validate: Option<bool>) -> Result<UpdateNotificationResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_notification);
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct UpdateNotificationInput {
	pub id: String,
	pub updates: NotificationUpdateReadInput,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateNotificationResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_notification(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: UpdateNotificationInput, _extras: NoExtras) -> Result<UpdateNotificationResult, Error> {
	let UpdateNotificationInput { id, updates } = input;
	
	let old_data = get_notification(&ctx, &id).await?;
	assert_user_can_modify(&ctx, &actor, &old_data).await?;

	let new_data = Notification {
		readTime: updates.readTime,
		..old_data
	};

	upsert_db_entry_by_id_for_struct(&ctx, "notifications".to_owned(), id.to_string(), new_data).await?;

	Ok(UpdateNotificationResult { __: gql_placeholder() })
}