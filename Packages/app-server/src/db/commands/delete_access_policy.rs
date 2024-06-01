use deadpool_postgres::tokio_postgres::GenericClient;
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
use crate::db::access_policies_::_permission_set::APAction;
use crate::db::commands::_command::{command_boilerplate, delete_db_entry_by_id, gql_placeholder};
use crate::db::general::permission_helpers::assert_user_can_delete;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::general::subtree_collector::params;
use crate::db::user_hiddens::get_user_hiddens;
use crate::db::users::User;
use crate::utils::db::accessors::{get_db_entries, AccessorContext};
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_DeleteAccessPolicy;
#[Object] impl MutationShard_DeleteAccessPolicy {
	async fn delete_access_policy(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteAccessPolicyInput, only_validate: Option<bool>) -> Result<DeleteAccessPolicyResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_access_policy);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct DeleteAccessPolicyInput {
	pub id: String,
}

#[derive(SimpleObject, Debug)]
pub struct DeleteAccessPolicyResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn delete_access_policy(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: DeleteAccessPolicyInput, _extras: NoExtras) -> Result<DeleteAccessPolicyResult, Error> {
	let DeleteAccessPolicyInput { id } = input;

	let old_data = get_access_policy(&ctx, &id).await?;
	//let rls_data = old_data.get_rls_data();
	assert_user_can_delete(&ctx, &actor, &old_data).await?;
	delete_db_entry_by_id(&ctx, "accessPolicies".to_owned(), id.to_string()).await?;

	/*let user_hiddens_referencing_policy = get_db_entries(&ctx, "userHiddens", &Some(json!({
		"lastAccessPolicy": {"equalTo": id}
	}))).await?;
	for user_hidden in user_hiddens_referencing_policy {}*/

	ctx.tx.query_raw(r#"UPDATE "userHiddens" as t1 SET "lastAccessPolicy" = NULL WHERE t1."lastAccessPolicy" = $1"#, params(&[&id])).await?;

	Ok(DeleteAccessPolicyResult { __: gql_placeholder() })
}
