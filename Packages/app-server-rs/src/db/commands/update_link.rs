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
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_update, assert_user_can_update_simple};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_child_links::{NodeChildLink, get_node_child_link, NodeChildLinkUpdates};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_UpdateLink;
#[Object] impl MutationShard_UpdateLink {
	async fn update_link(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateLinkInput, only_validate: Option<bool>) -> Result<UpdateLinkResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_link);
    }
}

#[derive(InputObject, Deserialize)]
pub struct UpdateLinkInput {
	pub id: String,
	pub updates: NodeChildLinkUpdates,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateLinkResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_link(ctx: &AccessorContext<'_>, actor: &User, input: UpdateLinkInput, _extras: NoExtras) -> Result<UpdateLinkResult, Error> {
	let UpdateLinkInput { id, updates } = input;
	let result = UpdateLinkResult { __: gql_placeholder() };
	
	let old_data = get_node_child_link(&ctx, &id).await?;
	//assert_user_can_update(&ctx, &actor, &old_data.creator, &old_data.accessPolicy).await?;
	assert_user_can_update_simple(&actor, &old_data.creator)?;
	let new_data = NodeChildLink {
		orderKey: update_field(updates.orderKey, old_data.orderKey),
		form: update_field_nullable(updates.form, old_data.form),
		polarity: update_field_nullable(updates.polarity, old_data.polarity),
		..old_data
	};

	set_db_entry_by_id_for_struct(&ctx, "nodeChildLinks".to_owned(), id.to_string(), new_data).await?;

	Ok(result)
}