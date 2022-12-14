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

use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::shares::{Share, ShareInput};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras, command_boilerplate};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_AddShare;
#[Object] impl MutationShard_AddShare {
	async fn add_share(&self, gql_ctx: &async_graphql::Context<'_>, input: AddShareInput) -> Result<AddShareResult, GQLError> {
		command_boilerplate!(gql_ctx, input, add_share);
    }
}

#[derive(InputObject, Deserialize)]
pub struct AddShareInput {
	pub share: ShareInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddShareResult {
	pub id: String,
}

}

pub async fn add_share(ctx: &AccessorContext<'_>, user_info: &User, input: AddShareInput, _extras: NoExtras) -> Result<AddShareResult, Error> {
	let AddShareInput { share: share_ } = input;
	let mut result = AddShareResult { id: "<tbd>".to_owned() };
	
	let share = Share {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: user_info.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		name: share_.name,
		r#type: share_.r#type,
		mapID: share_.mapID,
		mapView: share_.mapView,
	};
	result.id = share.id.to_string();

	set_db_entry_by_id_for_struct(&ctx, "shares".to_owned(), share.id.to_string(), share).await?;

	Ok(result)
}