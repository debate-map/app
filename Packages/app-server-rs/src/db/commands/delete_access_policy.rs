use deadpool_postgres::tokio_postgres::GenericClient;
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
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder};
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_delete_simple};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::general::subtree_collector::params;
use crate::db::user_hiddens::get_user_hiddens;
use crate::utils::db::accessors::{AccessorContext, get_db_entries};
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct};

wrap_slow_macros!{

#[derive(InputObject, Deserialize)]
pub struct DeleteAccessPolicyInput {
	pub id: String,
}

#[derive(SimpleObject, Debug)]
pub struct DeleteAccessPolicyResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

#[derive(Default)]
pub struct MutationShard_DeleteAccessPolicy;
#[Object]
impl MutationShard_DeleteAccessPolicy {
	async fn delete_access_policy(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteAccessPolicyInput) -> Result<DeleteAccessPolicyResult, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_write(&mut anchor, gql_ctx).await?;
		let user_info = get_user_info_from_gql_ctx(&gql_ctx, &ctx).await?;
		let DeleteAccessPolicyInput { id } = input;
		let result = DeleteAccessPolicyResult { __: gql_placeholder() };
		
		let old_data = get_access_policy(&ctx, &id).await?;
		assert_user_can_delete_simple(&user_info, &old_data.creator)?;
		delete_db_entry_by_id(&ctx, "accessPolicies".to_owned(), id.to_string()).await?;

		/*let user_hiddens_referencing_policy = get_db_entries(&ctx, "userHiddens", &Some(json!({
			"lastAccessPolicy": {"equalTo": id}
		}))).await?;
		for user_hidden in user_hiddens_referencing_policy {}*/

		ctx.tx.query_raw(r#"UPDATE "userHiddens" as t1 SET "lastAccessPolicy" = NULL WHERE t1."lastAccessPolicy" = $1"#, params(&[&id])).await?;

		ctx.tx.commit().await?;
		info!("Command completed! Result:{:?}", result);
		Ok(result)
    }
}

}