use rust_shared::anyhow::{anyhow, Error};
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

use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::shares::{Share, ShareInput};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{command_boilerplate, upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_AddShare;
#[Object] impl MutationShard_AddShare {
	async fn add_share(&self, gql_ctx: &async_graphql::Context<'_>, input: AddShareInput, only_validate: Option<bool>) -> Result<AddShareResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_share);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddShareInput {
	pub share: ShareInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddShareResult {
	pub id: String,
}

}

pub async fn add_share(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddShareInput, _extras: NoExtras) -> Result<AddShareResult, Error> {
	let AddShareInput { share: share_ } = input;

	let share = Share {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		name: share_.name,
		r#type: share_.r#type,
		mapID: share_.mapID,
		mapView: share_.mapView,
	};

	upsert_db_entry_by_id_for_struct(&ctx, "shares".to_owned(), share.id.to_string(), share.clone()).await?;

	Ok(AddShareResult { id: share.id.to_string() })
}
