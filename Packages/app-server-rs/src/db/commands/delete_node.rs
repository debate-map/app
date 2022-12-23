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
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder};
use crate::db::commands::_shared::increment_map_edits::{increment_map_edits, increment_map_edits_if_valid};
use crate::db::general::permission_helpers::{assert_user_can_delete, is_user_creator_or_mod};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_links::get_node_links;
use crate::db::nodes::{get_node, is_root_node, assert_user_can_delete_node};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, command_boilerplate};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_DeleteNode;
#[Object] impl MutationShard_DeleteNode {
	async fn delete_node(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteNodeInput, only_validate: Option<bool>) -> Result<DeleteNodeResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_node);
    }
}


#[derive(InputObject, Deserialize)]
pub struct DeleteNodeInput {
	pub mapID: Option<String>,
	pub nodeID: String,
}

#[derive(SimpleObject, Debug)]
pub struct DeleteNodeResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

#[derive(Default)]
pub struct DeleteNodeExtras {
	pub as_part_of_map_delete: bool,
	//pub parent_node_ids: Vec<String>,
	//pub child_node_ids: Vec<String>,
}

pub async fn delete_node(ctx: &AccessorContext<'_>, actor: &User, input: DeleteNodeInput, extras: DeleteNodeExtras) -> Result<DeleteNodeResult, Error> {
	let DeleteNodeInput { mapID, nodeID } = input;
	
	let old_data = get_node(&ctx, &nodeID).await?;
	assert_user_can_delete_node(&ctx, &actor, &old_data, extras.as_part_of_map_delete, vec![], vec![]).await?;

	// first delete the rows in other tables that reference this node
	// (will likely need to update this later, when completing permission system; have to decide how to handle deletion of node, when other users created linked phrasings, ratings, etc.)
	// (first step will probably be adding a "soft delete" system, in place-of/addition-to the hard-delete behavior that currently occurs)
	ctx.tx.execute(r#"DELETE FROM "nodePhrasings" WHERE node = $1"#, &[&nodeID]).await?;
	ctx.tx.execute(r#"DELETE FROM "nodeRatings" WHERE node = $1"#, &[&nodeID]).await?;
	ctx.tx.execute(r#"DELETE FROM "nodeLinks" WHERE parent = $1 OR child = $1"#, &[&nodeID]).await?;
	ctx.tx.execute(r#"DELETE FROM "nodeLinks" WHERE parent = $1 OR child = $1"#, &[&nodeID]).await?;
	ctx.tx.execute(r#"DELETE FROM "mapNodeEdits" WHERE node = $1"#, &[&nodeID]).await?;
	ctx.tx.execute(r#"DELETE FROM "nodeRevisions" WHERE node = $1"#, &[&nodeID]).await?;
	// todo: delete any tags for which this node is the only associated node

	delete_db_entry_by_id(&ctx, "nodes".to_owned(), nodeID.to_string()).await?;

	increment_map_edits_if_valid(&ctx, mapID).await?;

	Ok(DeleteNodeResult { __: gql_placeholder() })
}