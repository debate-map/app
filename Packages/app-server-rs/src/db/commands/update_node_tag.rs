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
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder, set_db_entry_by_id, update_field, update_field_nullable};
use crate::db::general::permission_helpers::{assert_user_can_delete, assert_user_can_update, assert_user_can_update_simple};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_tags::{NodeTag, NodeTagInput, get_node_tag, NodeTagUpdates};
use crate::db::nodes::get_node;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, command_boilerplate, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_UpdateNodeTag;
#[Object] impl MutationShard_UpdateNodeTag {
	async fn update_node_tag(&self, gql_ctx: &async_graphql::Context<'_>, input: UpdateNodeTagInput) -> Result<UpdateNodeTagResult, GQLError> {
		command_boilerplate!(gql_ctx, input, update_node_tag);
    }
}

#[derive(InputObject, Deserialize)]
pub struct UpdateNodeTagInput {
	pub id: String,
	pub updates: NodeTagUpdates,
}

#[derive(SimpleObject, Debug)]
pub struct UpdateNodeTagResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub async fn update_node_tag(ctx: &AccessorContext<'_>, user_info: &User, input: UpdateNodeTagInput, _extras: NoExtras) -> Result<UpdateNodeTagResult, Error> {
	let UpdateNodeTagInput { id, updates } = input;
	let result = UpdateNodeTagResult { __: gql_placeholder() };
	
	let old_data = get_node_tag(&ctx, &id).await?;
	//assert_user_can_update(&ctx, &user_info, &old_data.creator, &old_data.accessPolicy).await?;
	/*for node_id in old_data.nodes {
		let node = get_node(&ctx, &node_id).await?;
		assert_user_can_update(&ctx, &user_info, node.creator, node.access_policy).await?;
	}*/
	assert_user_can_update_simple(&user_info, &old_data.creator)?; // this maybe is insufficient, but it's fine for now
	let new_data = NodeTag {
		nodes: update_field(updates.nodes, old_data.nodes),
		labels: update_field_nullable(updates.labels, old_data.labels),
		mirrorChildrenFromXToY: update_field_nullable(updates.mirrorChildrenFromXToY, old_data.mirrorChildrenFromXToY),
		xIsExtendedByY: update_field_nullable(updates.xIsExtendedByY, old_data.xIsExtendedByY),
		mutuallyExclusiveGroup: update_field_nullable(updates.mutuallyExclusiveGroup, old_data.mutuallyExclusiveGroup),
		restrictMirroringOfX: update_field_nullable(updates.restrictMirroringOfX, old_data.restrictMirroringOfX),
		cloneHistory: update_field_nullable(updates.cloneHistory, old_data.cloneHistory),
		..old_data
	};

	set_db_entry_by_id_for_struct(&ctx, "nodeTags".to_owned(), id.to_string(), new_data).await?;

	Ok(result)
}