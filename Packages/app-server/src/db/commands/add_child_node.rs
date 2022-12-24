use std::fmt::{Formatter, Display};

use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, Context, ensure};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::_shared::increment_map_edits::increment_map_edits_if_valid;
use crate::db::commands::add_node_link::{add_node_link, AddNodeLinkInput};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_links::{NodeLinkInput, NodeLink};
use crate::db::node_phrasings::NodePhrasing_Embedded;
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput};
use crate::db::nodes::get_node;
use crate::db::nodes_::_node::{NodeInput};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras, tbd};
use super::_shared::add_node::add_node;

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_AddChildNode;
#[Object] impl MutationShard_AddChildNode {
	async fn add_child_node(&self, gql_ctx: &async_graphql::Context<'_>, input: AddChildNodeInput, only_validate: Option<bool>) -> Result<AddChildNodeResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_child_node);
    }
}

#[derive(InputObject, Deserialize)]
pub struct AddChildNodeInput {
    pub mapID: Option<String>,
	pub parentID: String,
	pub node: NodeInput,
    pub revision: NodeRevisionInput,
    pub link: NodeLinkInput,
}

#[derive(SimpleObject, Debug)]
pub struct AddChildNodeResult {
    pub nodeID: String,
    pub revisionID: String,
    pub linkID: String,
    pub doneAt: i64,
}

}

pub async fn add_child_node(ctx: &AccessorContext<'_>, actor: &User, input: AddChildNodeInput, _extras: NoExtras) -> Result<AddChildNodeResult, Error> {
	let AddChildNodeInput { mapID, parentID, node: node_, revision: revision_, link: link_ } = input;
	
    let node_id = new_uuid_v4_as_b64();
    let link = NodeLinkInput {
        // set by server
        parent: Some(parentID.clone()),
        child: Some(node_id.clone()),
        // pass-through
        ..link_
    };

	let add_node_result = add_node(ctx, actor, node_, Some(node_id.clone()), revision_).await?;
    ensure!(add_node_result.nodeID == node_id, "The node-id returned by add_node didn't match the node-id-override supplied to it!");

	let add_node_link_result = add_node_link(ctx, actor, AddNodeLinkInput { link }, Default::default()).await?;
    
	increment_map_edits_if_valid(&ctx, mapID).await?;

	Ok(AddChildNodeResult {
        nodeID: add_node_result.nodeID,
        revisionID: add_node_result.revisionID,
        linkID: add_node_link_result.id,
        doneAt: time_since_epoch_ms_i64(),
    })
}