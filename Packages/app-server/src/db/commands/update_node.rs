use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
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

use crate::db::access_policies::get_access_policy;
use crate::db::access_policies_::_permission_set::APAction;
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable, command_boilerplate};
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_modify};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::nodes::{get_node};
use crate::db::nodes_::_node::{Node, NodeUpdates, node_extras_locked_subfields};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras, update_field_of_extras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_UpdateNode;
#[Object] impl MutationShard_UpdateNode {
	async fn update_node(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateNodeInput, only_validate: Option<bool>) -> Result<UpdateNodeResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, update_node);
    }
}

#[derive(InputObject, Serialize, Deserialize, Clone)]
pub struct UpdateNodeInput {
	pub id: String,
	pub updates: NodeUpdates,
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct UpdateNodeResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_node(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: UpdateNodeInput, _extras: NoExtras) -> Result<UpdateNodeResult, Error> {
	let UpdateNodeInput { id, updates } = input;
	
	let old_data = get_node(&ctx, &id).await?;
	//assert_user_can_do_x_for_commands(&ctx, &actor, APAction::Modify, ActionTarget::for_node(old_data.creator.o(), old_data.accessPolicy.o())).await?;
	assert_user_can_modify(&ctx, &actor, &old_data).await?;
	let new_data = Node {
		accessPolicy: update_field(updates.accessPolicy, old_data.accessPolicy),
		//multiPremiseArgument: update_field_nullable(updates.multiPremiseArgument, old_data.multiPremiseArgument),
		argumentType: update_field_nullable(updates.argumentType, old_data.argumentType),
		extras: update_field_of_extras(updates.extras, old_data.extras, node_extras_locked_subfields())?,
		..old_data
	};

	upsert_db_entry_by_id_for_struct(&ctx, "nodes".to_owned(), id.to_string(), new_data).await?;

	Ok(UpdateNodeResult { __: gql_placeholder() })
}