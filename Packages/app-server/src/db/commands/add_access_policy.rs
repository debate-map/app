use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::indexmap::IndexMap;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::info;

use crate::db::access_policies_::_access_policy::{AccessPolicyInput, AccessPolicy};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::terms::{Term, TermInput};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{upsert_db_entry_by_id_for_struct, command_boilerplate, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_AddAccessPolicy;
#[Object] impl MutationShard_AddAccessPolicy {
	async fn add_access_policy(&self, gql_ctx: &async_graphql::Context<'_>, input: AddAccessPolicyInput, only_validate: Option<bool>) -> Result<AddAccessPolicyResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_access_policy);
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddAccessPolicyInput {
	pub policy: AccessPolicyInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddAccessPolicyResult {
	pub id: String,
}

}

pub async fn add_access_policy(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddAccessPolicyInput, _extras: NoExtras) -> Result<AddAccessPolicyResult, Error> {
	let AddAccessPolicyInput { policy: policy_ } = input;
	
	let policy = AccessPolicy {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		name: policy_.name,
		permissions: policy_.permissions,
		permissions_userExtends: policy_.permissions_userExtends,
	};

	upsert_db_entry_by_id_for_struct(&ctx, "accessPolicies".to_owned(), policy.id.to_string(), policy.clone()).await?;

	Ok(AddAccessPolicyResult { id: policy.id.to_string() })
}