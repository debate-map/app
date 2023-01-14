use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable, command_boilerplate};
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_modify};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::terms::{Term, TermInput, get_term, TermUpdates};
use crate::db::user_hiddens::{UserFollow, get_user_hidden};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};
use super::_shared::jsonb_utils::jsonb_set;

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_SetUserFollowData;
#[Object] impl MutationShard_SetUserFollowData {
	async fn set_user_follow_data(&self, gql_ctx: &async_graphql::Context<'_>, input: SetUserFollowDataInput, only_validate: Option<bool>) -> Result<SetUserFollowDataResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, set_user_follow_data);
    }
}

#[derive(InputObject, Deserialize)]
pub struct SetUserFollowDataInput {
	pub targetUser: String,
	pub userFollow: Option<UserFollow>,
}

#[derive(SimpleObject, Debug)]
pub struct SetUserFollowDataResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn set_user_follow_data(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: SetUserFollowDataInput, _extras: NoExtras) -> Result<SetUserFollowDataResult, Error> {
	let SetUserFollowDataInput { targetUser, userFollow } = input;

	let user_hidden = get_user_hidden(ctx, &targetUser).await?;
	assert_user_can_modify(ctx, actor, &user_hidden).await?;
	
	let user_follow_as_json_value = if let Some(userFollow) = userFollow { Some(serde_json::to_value(userFollow)?) } else { None };
	jsonb_set(&ctx.tx, "userHiddens", &actor.id, "extras", vec!["userFollows".to_owned(), targetUser], user_follow_as_json_value).await?;

	Ok(SetUserFollowDataResult { __: gql_placeholder() })
}