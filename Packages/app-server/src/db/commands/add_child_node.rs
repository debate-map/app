use std::fmt::{Display, Formatter};

use rust_shared::anyhow::{anyhow, ensure, Context, Error};
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

use crate::db::_shared::common_errors::err_should_be_null;
use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::_shared::increment_edits::increment_edits_if_valid;
use crate::db::commands::_shared::record_command_run::record_command_run;
use crate::db::commands::add_node_link::{add_node_link, AddNodeLinkInput};
use crate::db::commands::add_subscription::{self, add_or_update_subscription, AddSubscriptionInput, AddSubscriptionInputBuilder};
use crate::db::general::permission_helpers::{assert_user_can_add_child, assert_user_can_add_phrasing};
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::node_links::{NodeLink, NodeLinkInput};
use crate::db::node_phrasings::NodePhrasing_Embedded;
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput};
use crate::db::nodes::get_node;
use crate::db::nodes_::_node::NodeInput;
use crate::db::user_hiddens::get_user_hidden;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{tbd, upsert_db_entry_by_id_for_struct, NoExtras};
use super::_shared::add_node::add_node;

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_AddChildNode;
#[Object] impl MutationShard_AddChildNode {
	async fn add_child_node(&self, gql_ctx: &async_graphql::Context<'_>, input: AddChildNodeInput, only_validate: Option<bool>) -> Result<AddChildNodeResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_child_node);
	}
}

#[derive(InputObject, Deserialize, Serialize, Clone)]
pub struct AddChildNodeInput {
	pub mapID: Option<String>,
	pub parentID: String,
	pub node: NodeInput,
	pub revision: NodeRevisionInput,
	pub link: NodeLinkInput,
	pub incrementEdits: Option<bool>,
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct AddChildNodeResult {
	pub nodeID: String,
	pub revisionID: String,
	pub linkID: String,
	pub doneAt: i64,
}

}

#[derive(Default)]
pub struct AddChildNodeExtras {
	pub avoid_recording_command_run: bool,
}

pub async fn add_child_node(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: AddChildNodeInput, extras: AddChildNodeExtras) -> Result<AddChildNodeResult, Error> {
	let AddChildNodeInput { mapID, parentID, node: node_, revision: revision_, link: link_, incrementEdits } = input.clone();

	let parent = get_node(ctx, &parentID).await?;
	assert_user_can_add_child(ctx, actor, &parent).await?; // defensive

	let node_id = new_uuid_v4_as_b64();
	ensure!(link_.parent.is_none() && link_.child.is_none(), err_should_be_null("[input.link.parent and input.link.child]").to_string());
	let link = NodeLinkInput {
		// set by server
		parent: Some(parentID.clone()),
		child: Some(node_id.clone()),
		// pass-through
		..link_
	};

	let add_node_result = add_node(ctx, actor, node_, Some(node_id.clone()), revision_).await?;
	ensure!(add_node_result.nodeID == node_id, "The node-id returned by add_node didn't match the node-id-override supplied to it!");

	let add_node_link_result = add_node_link(ctx, actor, false, AddNodeLinkInput { link }, Default::default()).await?;

	let user_hiddens = get_user_hidden(ctx, &actor.id).await?;
	if user_hiddens.notificationPolicy == "S" {
		let subscription = AddSubscriptionInputBuilder::new(add_node_link_result.id.clone()).with_add_child_node(true).with_add_child_node(true).with_add_node_link(true).with_add_node_revision(true).with_delete_node(true).with_delete_node_link(true).with_set_node_rating(true).build();

		add_or_update_subscription(ctx, actor, false, subscription, Default::default()).await?;

		let subscription = AddSubscriptionInputBuilder::new(parentID.clone()).with_add_child_node(true).with_add_child_node(true).with_add_node_link(true).with_add_node_revision(true).with_delete_node(true).with_delete_node_link(true).with_set_node_rating(true).build();

		add_or_update_subscription(ctx, actor, false, subscription, Default::default()).await?;
	}

	increment_edits_if_valid(ctx, Some(actor), mapID.clone(), is_root, incrementEdits).await?;

	let result = AddChildNodeResult { nodeID: add_node_result.nodeID, revisionID: add_node_result.revisionID, linkID: add_node_link_result.id, doneAt: time_since_epoch_ms_i64() };
	if !extras.avoid_recording_command_run {
		record_command_run(ctx, actor, "addChildNode".to_owned(), to_json_value_for_borrowed_obj(&input)?, to_json_value_for_borrowed_obj(&result)?, vec![input.parentID, result.nodeID.clone()]).await?;
	}
	Ok(result)
}
