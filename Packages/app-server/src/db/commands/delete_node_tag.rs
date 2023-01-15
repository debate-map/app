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
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, command_boilerplate};
use crate::db::general::permission_helpers::{assert_user_can_delete};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_tags::{NodeTag, NodeTagInput, get_node_tag};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_DeleteNodeTag;
#[Object] impl MutationShard_DeleteNodeTag {
	async fn delete_node_tag(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteNodeTagInput, only_validate: Option<bool>) -> Result<DeleteNodeTagResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_node_tag);
    }
}

#[derive(InputObject, Deserialize)]
pub struct DeleteNodeTagInput {
	pub id: String,
}

#[derive(SimpleObject, Debug)]
pub struct DeleteNodeTagResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn delete_node_tag(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: DeleteNodeTagInput, _extras: NoExtras) -> Result<DeleteNodeTagResult, Error> {
	let DeleteNodeTagInput { id } = input;
	
	let old_data = get_node_tag(&ctx, &id).await?;
	assert_user_can_delete(&ctx, &actor, &old_data).await?;

	delete_db_entry_by_id(&ctx, "nodeTags".to_owned(), id.to_string()).await?;

	Ok(DeleteNodeTagResult { __: gql_placeholder() })
}