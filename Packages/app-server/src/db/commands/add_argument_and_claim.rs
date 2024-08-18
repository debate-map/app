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
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::node_links::NodeLinkInput;
use crate::db::node_phrasings::NodePhrasing_Embedded;
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput};
use crate::db::nodes_::_node::NodeInput;
use crate::db::nodes_::_node_type::NodeType;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{tbd, upsert_db_entry_by_id_for_struct, NoExtras};
use super::_shared::add_node::add_node;
use super::_shared::increment_edits::increment_edits_if_valid;
use super::add_child_node::{add_child_node, AddChildNodeInput};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_AddArgumentAndClaim;
#[Object] impl MutationShard_AddArgumentAndClaim {
	async fn add_argument_and_claim(&self, gql_ctx: &async_graphql::Context<'_>, input: AddArgumentAndClaimInput, only_validate: Option<bool>) -> Result<AddArgumentAndClaimResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, add_argument_and_claim);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct AddArgumentAndClaimInput {
	pub mapID: Option<String>,
	pub argumentParentID: String,
	pub argumentNode: NodeInput,
	pub argumentRevision: NodeRevisionInput,
	pub argumentLink: NodeLinkInput,
	pub claimNode: NodeInput,
	pub claimRevision: NodeRevisionInput,
	pub claimLink: NodeLinkInput,
	pub incrementEdits: Option<bool>,
}

#[derive(SimpleObject, Debug)]
pub struct AddArgumentAndClaimResult {
	pub argumentNodeID: String,
	pub argumentRevisionID: String,
	pub argumentLinkID: String,
	pub claimNodeID: String,
	pub claimRevisionID: String,
	pub claimLinkID: String,
	pub doneAt: i64,
}

}

pub async fn add_argument_and_claim(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: AddArgumentAndClaimInput, _extras: NoExtras) -> Result<AddArgumentAndClaimResult, Error> {
	let AddArgumentAndClaimInput { mapID, argumentParentID, argumentNode, argumentRevision, argumentLink, claimNode, claimRevision, claimLink, incrementEdits } = input;

	#[rustfmt::skip]
	let add_argument_result = add_child_node(ctx, actor, false, AddChildNodeInput { mapID: None, parentID: argumentParentID.clone(), node: argumentNode.clone(), revision: argumentRevision.clone(), link: argumentLink.clone(), incrementEdits: Some(false) }, Default::default() ).await?;
	let add_claim_result = add_child_node(ctx, actor, false, AddChildNodeInput { mapID: None, parentID: add_argument_result.nodeID.clone(), node: claimNode, revision: claimRevision, link: claimLink, incrementEdits: Some(false) }, Default::default()).await?;

	increment_edits_if_valid(&ctx, Some(actor), mapID, is_root, incrementEdits).await?;

	Ok(AddArgumentAndClaimResult {
		argumentNodeID: add_argument_result.nodeID,
		argumentRevisionID: add_argument_result.revisionID,
		argumentLinkID: add_argument_result.linkID,
		claimNodeID: add_claim_result.nodeID,
		claimRevisionID: add_claim_result.revisionID,
		claimLinkID: add_claim_result.linkID,
		doneAt: time_since_epoch_ms_i64(),
	})
}
