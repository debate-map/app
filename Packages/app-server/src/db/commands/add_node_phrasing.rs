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

use crate::db::_shared::access_policy_target::AccessPolicyTarget;
use crate::db::commands::_command::command_boilerplate;
use crate::db::general::permission_helpers::assert_user_can_add_phrasing;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::node_phrasings::{NodePhrasing, NodePhrasingInput};
use crate::db::nodes::get_node;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_AddNodePhrasing;
#[Object] impl MutationShard_AddNodePhrasing {
	async fn add_node_phrasing(&self, gql_ctx: &async_graphql::Context<'_>, input: AddNodePhrasingInput, only_validate: Option<bool>) -> Result<AddNodePhrasingResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_node_phrasing);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddNodePhrasingInput {
	pub phrasing: NodePhrasingInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddNodePhrasingResult {
	pub id: String,
}

}

pub async fn add_node_phrasing(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddNodePhrasingInput, _extras: NoExtras) -> Result<AddNodePhrasingResult, Error> {
	let AddNodePhrasingInput { phrasing: phrasing_ } = input;

	let node = get_node(&ctx, &phrasing_.node).await?;
	assert_user_can_add_phrasing(ctx, actor, &node).await?;

	let phrasing = NodePhrasing {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		// pass-through
		node: phrasing_.node,
		r#type: phrasing_.r#type,
		text_base: phrasing_.text_base,
		text_negation: phrasing_.text_negation,
		text_question: phrasing_.text_question,
		text_narrative: phrasing_.text_narrative,
		note: phrasing_.note,
		terms: phrasing_.terms,
		references: phrasing_.references,
		c_accessPolicyTargets: vec![], // auto-set by db
	};

	upsert_db_entry_by_id_for_struct(&ctx, "nodePhrasings".to_owned(), phrasing.id.to_string(), phrasing.clone()).await?;

	Ok(AddNodePhrasingResult { id: phrasing.id.to_string() })
}
