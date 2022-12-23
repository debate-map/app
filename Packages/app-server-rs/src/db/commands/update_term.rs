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
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_update};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::terms::{Term, TermInput, get_term, TermUpdates};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_UpdateTerm;
#[Object] impl MutationShard_UpdateTerm {
	async fn update_term(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateTermInput, only_validate: Option<bool>) -> Result<UpdateTermResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_term);
    }
}

#[derive(InputObject, Deserialize)]
pub struct UpdateTermInput {
	pub id: String,
	pub updates: TermUpdates,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateTermResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_term(ctx: &AccessorContext<'_>, actor: &User, input: UpdateTermInput, _extras: NoExtras) -> Result<UpdateTermResult, Error> {
	let UpdateTermInput { id, updates } = input;
	
	let old_data = get_term(&ctx, &id).await?;
	assert_user_can_update(&ctx, &actor, &old_data.creator, &old_data.accessPolicy).await?;
	let new_data = Term {
		accessPolicy: update_field(updates.accessPolicy, old_data.accessPolicy),
		name: update_field(updates.name, old_data.name),
		forms: update_field(updates.forms, old_data.forms),
		disambiguation: update_field_nullable(updates.disambiguation, old_data.disambiguation),
		r#type: update_field(updates.r#type, old_data.r#type),
		definition: update_field(updates.definition, old_data.definition),
		note: update_field_nullable(updates.note, old_data.note),
		attachments: update_field(updates.attachments, old_data.attachments),
		..old_data
	};

	set_db_entry_by_id_for_struct(&ctx, "terms".to_owned(), id.to_string(), new_data).await?;

	Ok(UpdateTermResult { __: gql_placeholder() })
}