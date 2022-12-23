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
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_delete_simple};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_phrasings::{NodePhrasing, NodePhrasingInput, get_node_phrasing};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_DeleteNodePhrasing;
#[Object] impl MutationShard_DeleteNodePhrasing {
	async fn delete_node_phrasing(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteNodePhrasingInput, only_validate: Option<bool>) -> Result<DeleteNodePhrasingResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_node_phrasing);
    }
}

#[derive(InputObject, Deserialize)]
pub struct DeleteNodePhrasingInput {
	pub id: String,
}

#[derive(SimpleObject, Debug)]
pub struct DeleteNodePhrasingResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn delete_node_phrasing(ctx: &AccessorContext<'_>, actor: &User, input: DeleteNodePhrasingInput, _extras: NoExtras) -> Result<DeleteNodePhrasingResult, Error> {
	let DeleteNodePhrasingInput { id } = input;
	
	let old_data = get_node_phrasing(&ctx, &id).await?;
	//assert_user_can_delete(&ctx, &actor, &old_data.creator, &old_data.accessPolicy).await?;
	assert_user_can_delete_simple(&actor, &old_data.creator)?;

	delete_db_entry_by_id(&ctx, "nodePhrasings".to_owned(), id.to_string()).await?;

	Ok(DeleteNodePhrasingResult { __: gql_placeholder() })
}