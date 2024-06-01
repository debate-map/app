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
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_modify, is_user_creator_or_mod, is_user_mod};
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::maps::{get_map, Map, MapInput, MapUpdates};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_UpdateMap;
#[Object] impl MutationShard_UpdateMap {
	async fn update_map(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateMapInput, only_validate: Option<bool>) -> Result<UpdateMapResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_map);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct UpdateMapInput {
	pub id: String,
	pub updates: MapUpdates,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateMapResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_map(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: UpdateMapInput, _extras: NoExtras) -> Result<UpdateMapResult, Error> {
	let UpdateMapInput { id, updates } = input;

	let old_data = get_map(&ctx, &id).await?;
	assert_user_can_modify(&ctx, &actor, &old_data).await?;

	// when trying to modify certain fields, extra permissions are required
	if !updates.featured.is_undefined() {
		ensure!(is_user_mod(actor), "Only mods can set whether a map is featured.")
	}

	let new_data = Map {
		accessPolicy: update_field(updates.accessPolicy, old_data.accessPolicy),
		name: update_field(updates.name, old_data.name),
		note: update_field_nullable(updates.note, old_data.note),
		noteInline: update_field_nullable(updates.noteInline, old_data.noteInline),
		defaultExpandDepth: update_field(updates.defaultExpandDepth, old_data.defaultExpandDepth),
		nodeAccessPolicy: update_field_nullable(updates.nodeAccessPolicy, old_data.nodeAccessPolicy),
		featured: update_field_nullable(updates.featured, old_data.featured),
		editors: update_field(updates.editors, old_data.editors),
		extras: update_field(updates.extras, old_data.extras),
		// set by server
		//edits: old_data.edits + 1,
		editedAt: Some(time_since_epoch_ms_i64()),
		..old_data
	};

	upsert_db_entry_by_id_for_struct(&ctx, "maps".to_owned(), id.to_string(), new_data).await?;

	Ok(UpdateMapResult { __: gql_placeholder() })
}
