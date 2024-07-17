use std::fmt::{Display, Formatter};

use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::general_::serde::to_json_value_for_borrowed_obj;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use tracing::info;

use crate::db::_shared::common_errors::err_should_be_populated;
use crate::db::access_policies_::_permission_set::{APAction, APTable};
use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::_shared::increment_edits::increment_edits_if_valid;
use crate::db::general::permission_helpers::assert_user_can_modify;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::map_node_edits::{ChangeType, MapNodeEdit};
use crate::db::maps::get_map;
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput};
use crate::db::nodes::get_node;
use crate::db::user_hiddens::get_user_hidden;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras};
use super::_shared::record_command_run::{record_command_run, record_command_run_if_root};
use super::add_subscription::{add_or_update_subscription, AddSubscriptionInput, AddSubscriptionInputBuilder};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_AddNodeRevision;
#[Object] impl MutationShard_AddNodeRevision {
	async fn add_node_revision(&self, gql_ctx: &async_graphql::Context<'_>, input: AddNodeRevisionInput, only_validate: Option<bool>) -> Result<AddNodeRevisionResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_node_revision);
	}
}

#[derive(InputObject, Deserialize, Serialize, Clone)]
pub struct AddNodeRevisionInput {
	pub mapID: Option<String>,
	pub revision: NodeRevisionInput,
	pub incrementEdits: Option<bool>,
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct AddNodeRevisionResult {
	pub id: String,
}

}

#[derive(Default)]
pub struct AddNodeRevisionExtras {
	//pub is_child_command: Option<bool>,
	pub id_override: Option<String>,
}

pub async fn add_node_revision(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: AddNodeRevisionInput, extras: AddNodeRevisionExtras) -> Result<AddNodeRevisionResult, Error> {
	let AddNodeRevisionInput { mapID, revision: revision_, incrementEdits } = input.clone();

	let node_id = revision_.node.ok_or(err_should_be_populated("revision.node"))?;
	let node = get_node(ctx, &node_id).await?;
	//assert_user_can_do_x_for_commands(ctx, actor, APAction::Modify, ActionTarget::for_node(APTable::Nodes, node.accessPolicy.o())).await?;
	assert_user_can_modify(ctx, actor, &node).await?;

	let revision = NodeRevision {
		// set by server
		id: ID(extras.id_override.unwrap_or(new_uuid_v4_as_b64())),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		//phrasing_tsvector: "<tbd>".to_owned(), // auto-set by db
		replacedBy: None, // auto-set by db
		// pass-through
		node: node_id.clone(),
		phrasing: revision_.phrasing,
		displayDetails: revision_.displayDetails,
		attachments: revision_.attachments,
		c_accessPolicyTargets: vec![], // auto-set by db
	};
	upsert_db_entry_by_id_for_struct(ctx, "nodeRevisions".to_owned(), revision.id.to_string(), revision.clone()).await?;

	// also update node's "c_currentRevision" field
	ctx.tx.execute(r#"UPDATE "nodes" SET "c_currentRevision" = $1 WHERE id = $2"#, &[&revision.id.as_str(), &revision.node]).await?;

	// if node-revision was added from within a map, then add a map-node-edit entry (while also doing cleanup of old map-node-edit entries)
	if let Some(map_id) = mapID.clone() {
		// delete prior node-edit entries for this map+node (only need last entry for each)
		// todo: maybe change this to only remove old entries of same map+node+type
		ctx.tx.execute(r#"DELETE FROM "mapNodeEdits" WHERE map = $1 AND node = $2"#, &[&map_id, &revision.node]).await?;

		// delete old node-edits (ie. older than last 100) for this map, in mapNodeEdits, to avoid table getting too large
		// (we also limit the number of rows removed to 30, to avoid the possibility of hundreds of rows being removed all at once -- which caused a crash in the past)
		ctx.tx
			.execute(
				r#"DELETE FROM "mapNodeEdits" WHERE id IN (
			SELECT id FROM "mapNodeEdits" WHERE map = $1 ORDER BY time DESC OFFSET 100 LIMIT 30
		)"#,
				&[&map_id],
			)
			.await?;

		// add new node-edit entry
		let edit = MapNodeEdit {
			id: ID(new_uuid_v4_as_b64()),
			map: map_id.clone(),
			node: revision.node.clone(),
			time: time_since_epoch_ms_i64(),
			r#type: ChangeType::edit,
			c_accessPolicyTargets: vec![], // auto-set by db
		};
		upsert_db_entry_by_id_for_struct(&ctx, "mapNodeEdits".to_owned(), edit.id.to_string(), edit).await?;
	}

	increment_edits_if_valid(&ctx, Some(actor), mapID, is_root, incrementEdits).await?;

	let user_hiddens = get_user_hidden(ctx, &actor.id).await?;
	if user_hiddens.notificationPolicy == "S" {
		let subscription = AddSubscriptionInputBuilder::new(node_id.clone()).with_add_child_node(true).with_add_child_node(true).with_add_node_link(true).with_add_node_revision(true).with_delete_node(true).with_delete_node_link(true).with_set_node_rating(true).build();

		add_or_update_subscription(ctx, actor, false, subscription, Default::default()).await?;
	}

	let result = AddNodeRevisionResult { id: revision.id.to_string() };
	//if extras.is_child_command != Some(true) {
	record_command_run_if_root(ctx, actor, is_root, "addNodeRevision".to_owned(), to_json_value_for_borrowed_obj(&input)?, to_json_value_for_borrowed_obj(&result)?, vec![input.revision.node.ok_or(err_should_be_populated("input.revision.node"))?]).await?;
	Ok(result)
}
