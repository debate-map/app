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

use crate::db::commands::_command::command_boilerplate;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::terms::{Term, TermInput};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_AddTerm;
#[Object] impl MutationShard_AddTerm {
	async fn add_term(&self, gql_ctx: &async_graphql::Context<'_>, input: AddTermInput, only_validate: Option<bool>) -> Result<AddTermResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_term);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddTermInput {
	pub term: TermInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddTermResult {
	pub id: String,
}

}

pub async fn add_term(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddTermInput, _extras: NoExtras) -> Result<AddTermResult, Error> {
	let AddTermInput { term: term_ } = input;

	let term = Term {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		accessPolicy: term_.accessPolicy,
		attachments: term_.attachments,
		definition: term_.definition,
		disambiguation: term_.disambiguation,
		forms: term_.forms,
		name: term_.name,
		note: term_.note,
		r#type: term_.r#type,
	};

	upsert_db_entry_by_id_for_struct(&ctx, "terms".to_owned(), term.id.to_string(), term.clone()).await?;

	Ok(AddTermResult { id: term.id.to_string() })
}
