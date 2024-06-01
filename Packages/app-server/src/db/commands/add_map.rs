use std::fmt::{Display, Formatter};

use rust_shared::anyhow::{anyhow, Context, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use tracing::info;

use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::_shared::increment_edit_counts::increment_edit_counts_if_valid;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::map_node_edits::{ChangeType, MapNodeEdit};
use crate::db::maps::{Map, MapInput};
use crate::db::node_phrasings::NodePhrasing_Embedded;
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput};
use crate::db::nodes_::_node::NodeInput;
use crate::db::nodes_::_node_type::NodeType;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{insert_db_entry_by_id_for_struct, tbd, upsert_db_entry_by_id_for_struct, CanOmit, NoExtras};
use super::_shared::add_node::add_node;

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_AddMap;
#[Object] impl MutationShard_AddMap {
	async fn add_map(&self, gql_ctx: &async_graphql::Context<'_>, input: AddMapInput, only_validate: Option<bool>) -> Result<AddMapResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_map);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddMapInput {
	pub map: MapInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddMapResult {
	pub id: String,
	pub root_node_id: String,
}

}

pub async fn add_map(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: AddMapInput, _extras: NoExtras) -> Result<AddMapResult, Error> {
	let AddMapInput { map: map_ } = input;

	let root_node_id = new_uuid_v4_as_b64();
	let map = Map {
		// set by server
		id: ID(new_uuid_v4_as_b64()),
		creator: actor.id.to_string(),
		createdAt: time_since_epoch_ms_i64(),
		edits: 0,
		editedAt: Some(time_since_epoch_ms_i64()), // field should probably be non-nullable, since we set it at start to begin with
		rootNode: root_node_id.clone(),
		// pass-through
		accessPolicy: map_.accessPolicy,
		name: map_.name,
		note: map_.note,
		noteInline: map_.noteInline,
		defaultExpandDepth: map_.defaultExpandDepth,
		nodeAccessPolicy: map_.nodeAccessPolicy,
		featured: map_.featured,
		editors: map_.editors,
		extras: map_.extras,
	};
	insert_db_entry_by_id_for_struct(&ctx, "maps".o(), map.id.to_string(), map.clone()).await?;

	let new_root_node = NodeInput {
		accessPolicy: map.accessPolicy.clone(), // add-map dialog doesn't let user choose node-access-policy yet, so use the map's accessor policy for the root-node
		r#type: NodeType::category,
		rootNodeForMap: Some(map.id.to_string()),
		multiPremiseArgument: None,
		argumentType: None,
		extras: CanOmit::None,
	};
	let new_root_node_rev = NodeRevisionInput {
		phrasing: NodePhrasing_Embedded { text_base: "Root".o(), text_negation: None, text_question: None, text_narrative: None, note: None, terms: vec![] },
		node: None,
		displayDetails: None,
		attachments: vec![],
	};
	add_node(ctx, actor, new_root_node, Some(root_node_id.clone()), new_root_node_rev).await?;

	Ok(AddMapResult { id: map.id.to_string(), root_node_id })
}
