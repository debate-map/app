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

use crate::db::commands::_command::command_boilerplate;
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::medias::{Media, MediaInput};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_AddMedia;
#[Object] impl MutationShard_AddMedia {
	async fn add_media(&self, gql_ctx: &async_graphql::Context<'_>, input: AddMediaInput, only_validate: Option<bool>) -> Result<AddMediaResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_media);
    }
}

#[derive(InputObject, Deserialize)]
pub struct AddMediaInput {
	pub media: MediaInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddMediaResult {
	pub id: String,
}

}

pub async fn add_media(ctx: &AccessorContext<'_>, actor: &User, input: AddMediaInput, _extras: NoExtras) -> Result<AddMediaResult, Error> {
	let AddMediaInput { media: media_ } = input;
	let mut result = AddMediaResult { id: "<tbd>".to_owned() };
	
	let media = Media {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		accessPolicy: media_.accessPolicy,
		name: media_.name,
		r#type: media_.r#type,
		url: media_.url,
		description: media_.description,
	};
	result.id = media.id.to_string();

	//assert_user_is_mod(&user_info)?;
	if !actor.permissionGroups.r#mod { Err(anyhow!("Only moderators can add media currently. (till review/approval system is implemented)"))? }
	set_db_entry_by_id_for_struct(&ctx, "medias".to_owned(), media.id.to_string(), media).await?;

	Ok(result)
}