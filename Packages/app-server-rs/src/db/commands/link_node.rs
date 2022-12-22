use std::fmt::{Formatter, Display};

use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError, to_anyhow};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, Context, ensure};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::_shared::path_finder::search_up_from_node_for_node_matching_x;
use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::add_node_link::{AddNodeLinkInput, add_node_link};
use crate::db::commands::delete_node::{delete_node, DeleteNodeInput};
use crate::db::commands::delete_node_link::{self, delete_node_link, DeleteNodeLinkInput};
use crate::db::general::sign_in::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_links::{NodeLinkInput, ClaimForm, ChildGroup, Polarity, get_node_links, get_first_link_under_parent, get_highest_order_key_under_parent};
use crate::db::node_phrasings::NodePhrasing_Embedded;
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput};
use crate::db::nodes::get_node;
use crate::db::nodes_::_node::{NodeInput, ArgumentType};
use crate::db::nodes_::_node_type::NodeType;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::order_key::OrderKey;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, NoExtras, tbd};
use super::_shared::add_node::add_node;
use super::_shared::increment_map_edits::increment_map_edits_if_valid;
use super::add_child_node::{add_child_node, AddChildNodeInput};
use super::add_node_link::assert_link_is_valid;

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_LinkNode;
#[Object] impl MutationShard_LinkNode {
	/// This is a higher-level wrapper around `addNodeLink`, which handles unlinking from old parent (if requested), etc.
	async fn link_node(&self, gql_ctx: &async_graphql::Context<'_>, input: LinkNodeInput, only_validate: Option<bool>) -> Result<LinkNodeResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, link_node);
    }
}

#[derive(InputObject, Deserialize)]
pub struct LinkNodeInput {
	pub mapID: Option<String>,
	pub oldParentID: Option<String>,
	pub newParentID: String,
	pub nodeID: String,
	pub childGroup: ChildGroup,
	pub newForm: Option<ClaimForm>,
	pub newPolarity: Option<Polarity>,
	pub unlinkFromOldParent: Option<bool>,
	pub deleteEmptyArgumentWrapper: Option<bool>,
}

#[derive(SimpleObject, Debug)]
pub struct LinkNodeResult {
	argumentWrapperID: Option<String>,
}

}

async fn id_is_of_node_that_is_root_of_map(ctx: &AccessorContext<'_>, id: &str, _extra_data: Option<&JSONValue>) -> Result<bool, Error> {
	Ok(get_node(ctx, id).await?.rootNodeForMap.is_some())
}

pub async fn link_node(ctx: &AccessorContext<'_>, actor: &User, input: LinkNodeInput, _extras: NoExtras) -> Result<LinkNodeResult, Error> {
	let LinkNodeInput { mapID, oldParentID, newParentID, nodeID, childGroup, newForm, newPolarity, unlinkFromOldParent, deleteEmptyArgumentWrapper } = input;
	let unlink_from_old_parent = unlinkFromOldParent.unwrap_or(false);
	let delete_empty_argument_wrapper = deleteEmptyArgumentWrapper.unwrap_or(false);
	
	let node_data = get_node(ctx, &nodeID).await?;
	//let old_parent = oldParentID.map_or(async { None }, |a| get_node(ctx, &a)).await?;
	let old_parent = if let Some(oldParentID) = &oldParentID { Some(get_node(ctx, oldParentID).await?) } else { None };
	let new_parent = get_node(ctx, &newParentID).await?;
	let order_key_for_outer_node = get_highest_order_key_under_parent(ctx, Some(&newParentID)).await?.next()?;

	let pasting_premise_as_relevance_arg = node_data.r#type == NodeType::claim && childGroup == ChildGroup::relevance;
	ensure!(oldParentID.as_ref() != Some(&newParentID) || pasting_premise_as_relevance_arg, "Old-parent-id and new-parent-id cannot be the same! (unless changing between truth-arg and relevance-arg)");

	if unlink_from_old_parent {
		let closest_map_root_node = if new_parent.rootNodeForMap.is_some() {
			Some(newParentID.clone())
		} else {
			search_up_from_node_for_node_matching_x(ctx, &newParentID, id_is_of_node_that_is_root_of_map, None, vec![nodeID.clone()]).await?
		};
		ensure!(closest_map_root_node.is_some(), "Cannot move a node to a path that would orphan it.");
	}

	let mut new_parent_id_for_claim = newParentID.clone();
	let wrapper_arg_needed = is_wrapper_arg_needed_for_transfer(new_parent.r#type, childGroup, node_data.r#type, None);
	let add_arg_wrapper_result = match wrapper_arg_needed {
		false => None,
		true => {
			ensure!(childGroup == ChildGroup::relevance || childGroup == ChildGroup::truth,
				"Claim is being linked under parent that requires a wrapper-argument, but the specified child-group ({childGroup:?}) is incompatible with that.");

			let new_polarity = newPolarity.unwrap_or(Polarity::supporting); // if new-polarity isn't supplied, just default to Supporting (this can happen if a claim is copied from search-results)
			let argument_wrapper = NodeInput {
				//accessPolicy: GetDefaultAccessPolicyID_ForNode(),
				accessPolicy: node_data.accessPolicy,
				r#type: NodeType::argument,
				argumentType: Some(ArgumentType::all),
				rootNodeForMap: None,
				multiPremiseArgument: None,
			};
			let argument_wrapper_revision = NodeRevisionInput {
				phrasing: NodePhrasing_Embedded { text_base: "".o(), ..Default::default() },
				..Default::default()
			};
			let argument_wrapper_link = NodeLinkInput {
				group: childGroup,
				orderKey: order_key_for_outer_node.clone(),
				polarity: Some(new_polarity),
				parent: None,
				child: None,
				form: None,
				seriesAnchor: None,
				seriesEnd: None,
			};

			let result = add_child_node(ctx, actor, AddChildNodeInput { mapID: None, parentID: newParentID.o(), node: argument_wrapper, revision: argument_wrapper_revision, link: argument_wrapper_link }, Default::default()).await?;
			new_parent_id_for_claim = result.nodeID.clone();
			Some(result)
		},
	};

	add_node_link(ctx, actor, AddNodeLinkInput {
		//mapID,
		link: NodeLinkInput {
			parent: Some(new_parent_id_for_claim),
			child: Some(nodeID.o()),
			group: if wrapper_arg_needed { ChildGroup:: generic } else { childGroup },
			form: newForm,
			polarity: if node_data.r#type == NodeType::argument { Some(newPolarity.unwrap_or(Polarity::supporting)) } else { None },
			orderKey: if wrapper_arg_needed { OrderKey::mid() } else { order_key_for_outer_node },
			seriesAnchor: None,
			seriesEnd: None,
		},
	}, Default::default()).await?;

	if unlink_from_old_parent && let Some(old_parent) = old_parent {
		//let link = get_first_link_under_parent(ctx, &nodeID, old_parent.id.as_str()).await?;
		for link in get_node_links(ctx, Some(old_parent.id.as_str()), Some(nodeID.as_str())).await? {
			delete_node_link(ctx, actor, DeleteNodeLinkInput { mapID: None, id: link.id.to_string() }, Default::default()).await?;
		}

		// if parent was argument, and it now has no children left, and the actor allows it (ie. their view has node as single-premise arg), then also delete the argument parent
		let new_child_count = get_node_links(ctx, Some(old_parent.id.as_str()), None).await?.len();
		if old_parent.r#type == NodeType::argument && new_child_count == 0 && delete_empty_argument_wrapper {
			delete_node(ctx, actor, DeleteNodeInput { mapID: None, nodeID: old_parent.id.to_string() }, Default::default()).await?;
		}
	}
	
	increment_map_edits_if_valid(&ctx, mapID).await?;

	Ok(LinkNodeResult {
		argumentWrapperID: add_arg_wrapper_result.map(|a| a.nodeID),
	})
}

pub fn is_wrapper_arg_needed_for_transfer(parent_type: NodeType, parent_child_group: ChildGroup, transfer_node_type: NodeType, transfer_node_child_group: Option<ChildGroup>) -> bool {
	let transfer_node_is_valid_already = assert_link_is_valid(parent_type, parent_child_group, transfer_node_type).is_ok();
	let wrapper_arg_would_be_valid_in_parent = assert_link_is_valid(parent_type, parent_child_group, NodeType::argument).is_ok();
	let transfer_node_can_be_placed_in_wrapper_arg = transfer_node_type == NodeType::claim && (transfer_node_child_group.is_none() || transfer_node_child_group == Some(ChildGroup::generic));
	!transfer_node_is_valid_already && wrapper_arg_would_be_valid_in_parent && transfer_node_can_be_placed_in_wrapper_arg
}