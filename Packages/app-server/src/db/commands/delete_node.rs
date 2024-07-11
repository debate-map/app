use std::pin::Pin;

use crate::db::access_policies::get_access_policy;
use crate::db::commands::_command::{delete_db_entry_by_id, gql_placeholder};
use crate::db::commands::_shared::increment_edit_counts::{increment_edit_counts_if_valid, increment_map_edits};
use crate::db::general::permission_helpers::{assert_user_can_delete, is_user_creator_or_mod};
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::node_links::get_node_links;
use crate::db::nodes::{assert_user_can_delete_node, get_node, get_node_children, is_root_node, NodeDeleteAssertionError};
use crate::db::nodes_::_node::Node;
use crate::db::nodes_::_node_type::NodeType;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::anyhow::{anyhow, bail, ensure, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::itertools::Itertools;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use std::future::Future;
use tracing::{error, info};

use super::_command::{command_boilerplate, upsert_db_entry_by_id_for_struct};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_DeleteNode;
#[Object] impl MutationShard_DeleteNode {
	async fn delete_node(&self, gql_ctx: &async_graphql::Context<'_>, input: DeleteNodeInput, only_validate: Option<bool>) -> Result<DeleteNodeResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, delete_node);
	}
}


#[derive(InputObject, Serialize, Deserialize, Clone)]
pub struct DeleteNodeInput {
	pub mapID: Option<String>,
	pub nodeID: String,
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct DeleteNodeResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

#[derive(Default)]
pub struct DeleteNodeExtras {
	pub for_map_delete: bool,
	//pub parent_node_ids: Vec<String>,
	//pub child_node_ids: Vec<String>,
}

pub async fn delete_node(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: DeleteNodeInput, extras: DeleteNodeExtras) -> Result<DeleteNodeResult, Error> {
	let DeleteNodeInput { mapID, nodeID } = input;
	let node = get_node(&ctx, &nodeID).await?;

	delete(ctx, actor, &node, &extras, &mapID, is_root, false).await?;

	Ok(DeleteNodeResult { __: gql_placeholder() })
}

async fn delete(ctx: &AccessorContext<'_>, actor: &User, node: &Node, extras: &DeleteNodeExtras, map_id: &Option<String>, is_root: bool, for_recursive_comments_delete: bool) -> Result<(), Error> {
	let node_id = &node.id.to_string();
	let run = Box::pin(async {
		let children_nodes = get_node_children(ctx, &node.id).await?;
		let comment_children_to_delete = children_nodes.into_iter().filter(|n| n.r#type == NodeType::comment).collect_vec();
		let comment_children_to_delete_ids = comment_children_to_delete.iter().map(|n| n.id.to_string()).collect_vec();

		// do an initial check, with comment-children excluded from children-checks
		assert_user_can_delete_node(&ctx, &actor, &node, extras.for_map_delete, for_recursive_comments_delete, vec![], comment_children_to_delete_ids).await?;

		// now delete any comment children of node (includes comments created by others)
		for comment_child in comment_children_to_delete {
			delete(ctx, actor, &comment_child, extras, map_id, is_root, true).await?;
		}

		// do a final check, with no comment-children exclusion (since we've done the in-db-transaction deletion of them now)
		assert_user_can_delete_node(&ctx, &actor, &node, extras.for_map_delete, for_recursive_comments_delete, vec![], vec![]).await?;

		ctx.with_rls_disabled(
			|| async {
				// first delete the rows in other tables that reference this node
				// (will likely need to update this later, when completing permission system; have to decide how to handle deletion of node, when other users created linked phrasings, ratings, etc.)
				// (first step will probably be adding a "soft delete" system, in place-of/addition-to the hard-delete behavior that currently occurs)
				ctx.tx.execute(r#"DELETE FROM "nodePhrasings" WHERE node = $1"#, &[node_id]).await?;
				ctx.tx.execute(r#"DELETE FROM "nodeRatings" WHERE node = $1"#, &[&node_id]).await?;
				ctx.tx.execute(r#"DELETE FROM "nodeLinks" WHERE parent = $1 OR child = $1"#, &[&node_id]).await?;
				ctx.tx.execute(r#"DELETE FROM "nodeLinks" WHERE parent = $1 OR child = $1"#, &[&node_id]).await?;
				ctx.tx.execute(r#"DELETE FROM "mapNodeEdits" WHERE node = $1"#, &[&node_id]).await?;
				ctx.tx.execute(r#"DELETE FROM "nodeRevisions" WHERE node = $1"#, &[&node_id]).await?;
				// todo: maybe change approach: rather than deleting associated command-runs, we leave them up, but just restrict access to admins only from this point forward
				ctx.tx.execute(r#"DELETE FROM "commandRuns" WHERE $1 = ANY("c_involvedNodes")"#, &[&node_id]).await?;

				// todo: for any tag where this node is a member, update it to remove this node's id from the `nodes` array (and possibly other fields too)
				// todo: delete any tags for which this node is the only associated node

				Ok(())
			},
			Some("Failed to delete data associated with node."),
		)
		.await?;

		delete_db_entry_by_id(&ctx, "nodes".to_owned(), node_id.clone()).await?;

		increment_edit_counts_if_valid(&ctx, Some(actor), map_id.clone(), is_root).await?;
		Ok(())
	});
	run.await
}
