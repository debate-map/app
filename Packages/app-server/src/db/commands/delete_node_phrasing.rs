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

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{command_boilerplate, delete_db_entry_by_id, gql_placeholder};
use crate::db::general::permission_helpers::assert_user_can_delete;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::node_phrasings::{get_node_phrasing, NodePhrasing, NodePhrasingInput};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_DeleteNodePhrasing;
#[Object] impl MutationShard_DeleteNodePhrasing {
	async fn delete_node_phrasing(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteNodePhrasingInput, only_validate: Option<bool>) -> Result<DeleteNodePhrasingResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_node_phrasing);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct DeleteNodePhrasingInput {
	pub id: String,
}

#[derive(SimpleObject, Debug)]
pub struct DeleteNodePhrasingResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn delete_node_phrasing(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: DeleteNodePhrasingInput, _extras: NoExtras) -> Result<DeleteNodePhrasingResult, Error> {
	let DeleteNodePhrasingInput { id } = input;

	let old_data = get_node_phrasing(&ctx, &id).await?;
	assert_user_can_delete(&ctx, &actor, &old_data).await?;

	delete_db_entry_by_id(&ctx, "nodePhrasings".to_owned(), id.to_string()).await?;

	Ok(DeleteNodePhrasingResult { __: gql_placeholder() })
}
