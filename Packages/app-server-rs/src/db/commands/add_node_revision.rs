use std::fmt::{Formatter, Display};

use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, Context};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::_shared::common_errors::err_should_be_populated;
use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::_shared::increment_map_edits::increment_map_edits_if_valid;
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::map_node_edits::{ChangeType, MapNodeEdit};
use crate::db::node_revisions::{NodeRevisionInput, NodeRevision};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_AddNodeRevision;
#[Object] impl MutationShard_AddNodeRevision {
	async fn add_node_revision(&self, gql_ctx: &async_graphql::Context<'_>, input: AddNodeRevisionInput, only_validate: Option<bool>) -> Result<AddNodeRevisionResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_node_revision);
    }
}

#[derive(InputObject, Deserialize)]
pub struct AddNodeRevisionInput {
	pub mapID: Option<String>,
	pub revision: NodeRevisionInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddNodeRevisionResult {
	pub id: String,
}

}

#[derive(Default)]
pub struct AddNodeRevisionExtras {
	pub id_override: Option<String>,
}

pub async fn add_node_revision(ctx: &AccessorContext<'_>, actor: &User, input: AddNodeRevisionInput, extras: AddNodeRevisionExtras) -> Result<AddNodeRevisionResult, Error> {
	let AddNodeRevisionInput { mapID, revision: revision_ } = input;
	
	let revision = NodeRevision {
		// set by server
		id: ID(extras.id_override.unwrap_or(new_uuid_v4_as_b64())),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		phrasing_tsvector: "<tbd>".to_owned(), // set by database
		replacedBy: None,
		// pass-through
		node: revision_.node.ok_or(err_should_be_populated("revision.node"))?,
		phrasing: revision_.phrasing,
		note: revision_.note,
		displayDetails: revision_.displayDetails,
		attachments: revision_.attachments,
	};
	set_db_entry_by_id_for_struct(&ctx, "nodeRevisions".to_owned(), revision.id.to_string(), revision.clone()).await?;

	// also update node's "c_currentRevision" field
	ctx.tx.execute(r#"UPDATE "nodes" SET "c_currentRevision" = $1 WHERE id = $2"#, &[&revision.id.as_str(), &revision.node]).await?;

	// if node-revision was added from within a map, then add a map-node-edit entry (while also doing cleanup of old map-node-edit entries)
	if let Some(mapID) = mapID.clone() {
		// delete prior node-edit entries for this map+node (only need last entry for each)
		// todo: maybe change this to only remove old entries of same map+node+type
		ctx.tx.execute(r#"DELETE FROM "mapNodeEdits" WHERE map = $1 AND node = $2"#, &[&mapID, &revision.node]).await?;

		// delete old node-edits (ie. older than last 100) for this map, in mapNodeEdits, to avoid table getting too large
		// (we also limit the number of rows removed to 30, to avoid the possibility of hundreds of rows being removed all at once -- which caused a crash in the past)
		ctx.tx.execute(r#"DELETE FROM "mapNodeEdits" WHERE id IN (
			SELECT id FROM "mapNodeEdits" WHERE map = $1 ORDER BY time DESC OFFSET 100 LIMIT 30
		)"#, &[&mapID]).await?;

		// add new node-edit entry
		let edit = MapNodeEdit {
			id: ID(new_uuid_v4_as_b64()),
			map: mapID,
			node: revision.node.clone(),
			time: time_since_epoch_ms_i64(),
			r#type: ChangeType::edit,
		};
		set_db_entry_by_id_for_struct(&ctx, "mapNodeEdits".to_owned(), edit.id.to_string(), edit).await?;
	}

	increment_map_edits_if_valid(&ctx, mapID).await?;

	Ok(AddNodeRevisionResult { id: revision.id.to_string() })
}