use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::utils::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_phrasings::{NodePhrasing, NodePhrasingInput};
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct};

wrap_slow_macros!{

#[derive(InputObject, Deserialize)]
pub struct AddNodePhrasingInput {
	nodePhrasing: NodePhrasingInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddNodePhrasingResult {
	id: String,
}

#[derive(Default)]
pub struct MutationShard_AddNodePhrasing;
#[Object]
impl MutationShard_AddNodePhrasing {
	async fn add_node_phrasing(&self, gql_ctx: &async_graphql::Context<'_>, input: AddNodePhrasingInput) -> Result<AddNodePhrasingResult, Error> {
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_write(&mut anchor, gql_ctx).await?;
		let user_info = get_user_info_from_gql_ctx(&gql_ctx, &ctx).await?;
		let AddNodePhrasingInput { nodePhrasing: nodePhrasing_ } = input;
		let mut result = AddNodePhrasingResult { id: "<tbd>".to_owned() };
		
		let nodePhrasing = NodePhrasing {
			// set by server
			id: ID(new_uuid_v4_as_b64()),
			creator: user_info.id.to_string(),
			createdAt: time_since_epoch_ms_i64(),
			// pass-through
			node: nodePhrasing_.node,
			r#type: nodePhrasing_.r#type,
			text_base: nodePhrasing_.text_base,
			text_negation: nodePhrasing_.text_negation,
			text_question: nodePhrasing_.text_question,
			note: nodePhrasing_.note,
			terms: nodePhrasing_.terms,
			references: nodePhrasing_.references,
		};
		result.id = nodePhrasing.id.to_string();

		set_db_entry_by_id_for_struct(&ctx, "nodePhrasings".to_owned(), nodePhrasing.id.to_string(), nodePhrasing).await?;

		ctx.tx.commit().await?;
		info!("Command completed! Result:{:?}", result);
		Ok(result)
    }
}

}