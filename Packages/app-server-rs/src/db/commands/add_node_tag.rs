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

use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_tags::{NodeTag, NodeTagInput};
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct};

wrap_slow_macros!{

#[derive(InputObject, Deserialize)]
pub struct AddNodeTagInput {
	pub tag: NodeTagInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddNodeTagResult {
	pub id: String,
}

#[derive(Default)]
pub struct MutationShard_AddNodeTag;
#[Object]
impl MutationShard_AddNodeTag {
	async fn add_node_tag(&self, gql_ctx: &async_graphql::Context<'_>, input: AddNodeTagInput) -> Result<AddNodeTagResult, GQLError> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_write(&mut anchor, gql_ctx).await?;
		let user_info = get_user_info_from_gql_ctx(&gql_ctx, &ctx).await?;
		let AddNodeTagInput { tag: tag_ } = input;
		let mut result = AddNodeTagResult { id: "<tbd>".to_owned() };
		
		let tag = NodeTag {
			// set by server
			id: ID(new_uuid_v4_as_b64()),
			creator: user_info.id.to_string(),
			createdAt: time_since_epoch_ms_i64(),
			// pass-through
			nodes: tag_.nodes,
			labels: tag_.labels,
			mirrorChildrenFromXToY: tag_.mirrorChildrenFromXToY,
			xIsExtendedByY: tag_.xIsExtendedByY,
			mutuallyExclusiveGroup: tag_.mutuallyExclusiveGroup,
			restrictMirroringOfX: tag_.restrictMirroringOfX,
			cloneHistory: tag_.cloneHistory,
		};
		result.id = tag.id.to_string();

		set_db_entry_by_id_for_struct(&ctx, "nodeTags".to_owned(), tag.id.to_string(), tag).await?;

		ctx.tx.commit().await?;
		info!("Command completed! Result:{:?}", result);
		Ok(result)
    }
}

}