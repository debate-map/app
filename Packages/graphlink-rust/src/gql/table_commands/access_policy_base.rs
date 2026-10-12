use crate::anyhow::{anyhow, Error};
use crate::async_graphql::Object;
use crate::async_graphql::{InputObject, SimpleObject, ID};
use crate::gql::table_commands::_command::command_boilerplate;
use crate::rust_macros::wrap_slow_macros;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::{json, Value};
use crate::tracing::info;
use crate::{
	access_fail_msg, anyhow, async_graphql, can_actor_access_entry_struct, delete_db_entry_by_id, delete_fail_msg, does_policy_allow_x, get_access_policy, gql_placeholder, is_user_admin, is_user_creator_or_mod, is_user_mod, modify_fail_msg, new_uuid_v4_as_b64, params, serde_json,
	time_since_epoch_ms_i64, update_field, update_field_nullable, update_field_of_extras_new, upsert_db_entry_by_id_for_struct, AccessPolicy, AccessPolicyInput, AccessPolicyUpdates, AccessorContext, CanOmit, EntryBlob, EntryJSON, GQLError, GenericResponse, JSONValue, NoExtras, User,
};
use anyhow::ensure;

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_AccessPolicyBase;
#[Object] impl MutationShard_AccessPolicyBase {
	async fn add_access_policy(&self, gql_ctx: &async_graphql::Context<'_>, input: AddAccessPolicyInput, only_validate: Option<bool>) -> Result<GenericResponse, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_access_policy);
	}
	async fn update_access_policy(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateAccessPolicyInput, only_validate: Option<bool>) -> Result<GenericResponse, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_access_policy);
	}
	async fn delete_access_policy(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteAccessPolicyInput, only_validate: Option<bool>) -> Result<GenericResponse, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_access_policy);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddAccessPolicyInput {
	pub policy: AccessPolicyInput,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct UpdateAccessPolicyInput {
	pub id: String,
	pub updates: AccessPolicyUpdates,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct DeleteAccessPolicyInput {
	pub id: String,
}

}

pub async fn add_access_policy(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddAccessPolicyInput, _extras: NoExtras) -> Result<GenericResponse, Error> {
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

	upsert_db_entry_by_id_for_struct(&ctx, "access_policies".to_owned(), policy.id.to_string(), policy.clone()).await?;

	Ok(GenericResponse::new())
}

pub async fn update_access_policy(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: UpdateAccessPolicyInput, _extras: NoExtras) -> Result<GenericResponse, Error> {
	let UpdateAccessPolicyInput { id, updates } = input;

	let old_data = get_access_policy(&ctx, &id).await.map_err(|_| Error::msg(access_fail_msg()))?;
	ensure!(can_actor_access_entry_struct(&old_data, "access_policies", actor), access_fail_msg()); // defensive
	ensure!(is_user_creator_or_mod(actor, &old_data.creator), modify_fail_msg());

	//assert_user_can_modify_simple(&actor, &old_data.creator)?;
	//assert_user_can_do_x_for_commands(ctx, &actor, APAction::Modify, ActionTarget::for_access_policy(old_data.creator)).await?;
	//assert_user_can_modify(&ctx, &actor, &old_data).await?;
	ensure!(can_actor_access_entry_struct(&old_data, "access_policies", actor) && (*actor.id == id || is_user_admin(actor)), "You do not have permission to modify this entry.");

	let new_data = AccessPolicy {
		name: update_field(updates.name, old_data.name),
		permissions: update_field(updates.permissions, old_data.permissions),
		permissions_userExtends: update_field(updates.permissions_userExtends, old_data.permissions_userExtends),
		..old_data
	};

	upsert_db_entry_by_id_for_struct(&ctx, "access_policies".to_owned(), id.to_string(), new_data).await?;

	Ok(GenericResponse::new())
}

pub async fn delete_access_policy(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: DeleteAccessPolicyInput, _extras: NoExtras) -> Result<GenericResponse, Error> {
	let DeleteAccessPolicyInput { id } = input;

	let old_data = get_access_policy(&ctx, &id).await.map_err(|_| Error::msg(access_fail_msg()))?;
	ensure!(can_actor_access_entry_struct(&old_data, "access_policies", actor), access_fail_msg()); // defensive
	ensure!(is_user_creator_or_mod(actor, &old_data.creator), delete_fail_msg());

	delete_db_entry_by_id(&ctx, "access_policies".to_owned(), id.to_string()).await?;

	/*let user_hiddens_referencing_policy = get_db_entries(&ctx, "user_hiddens", &Some(json!({
		"lastAccessPolicy": {"equalTo": id}
	}))).await?;
	for user_hidden in user_hiddens_referencing_policy {}*/

	ctx.tx.query_raw(r#"UPDATE "user_hiddens" as t1 SET "lastAccessPolicy" = NULL WHERE t1."lastAccessPolicy" = $1"#, params(&[&id])).await?;

	Ok(GenericResponse::new())
}
