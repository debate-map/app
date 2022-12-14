use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::utils::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, command_boilerplate};
use crate::db::general::permission_helpers::assert_user_can_delete;
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::medias::{Media, MediaInput, get_media};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_DeleteMedia;
#[Object] impl MutationShard_DeleteMedia {
	async fn delete_media(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteMediaInput) -> Result<DeleteMediaResult, GQLError> {
		command_boilerplate!(gql_ctx, input, delete_media);
    }
}

#[derive(InputObject, Deserialize)]
pub struct DeleteMediaInput {
	pub id: String,
}

#[derive(SimpleObject, Debug)]
pub struct DeleteMediaResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn delete_media(ctx: &AccessorContext<'_>, user_info: &User, input: DeleteMediaInput, _extras: NoExtras) -> Result<DeleteMediaResult, Error> {
	let DeleteMediaInput { id } = input;
	let result = DeleteMediaResult { __: gql_placeholder() };
	
	let old_data = get_media(&ctx, &id).await?;
	assert_user_can_delete(&ctx, &user_info, &old_data.creator, &old_data.accessPolicy).await?;

	delete_db_entry_by_id(&ctx, "medias".to_owned(), id.to_string()).await?;

	Ok(result)
}