use std::fmt::{Display, Formatter};

use rust_shared::anyhow::{anyhow, ensure, Context, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Deserialize, Serialize};
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow, async_graphql, serde_json, to_anyhow, GQLError};
use tracing::info;

use crate::db::_shared::path_finder::{id_is_of_node_that_is_root_of_map, search_up_from_node_for_node_matching_x};
use crate::db::commands::_command::{command_boilerplate, CanOmit};
use crate::db::commands::add_node_link::{add_node_link, AddNodeLinkInput};
use crate::db::commands::delete_node::{delete_node, DeleteNodeInput};
use crate::db::commands::delete_node_link::{self, delete_node_link, DeleteNodeLinkInput};
use crate::db::general::permission_helpers::assert_user_can_add_child;
use crate::db::general::sign_in_::jwt_utils::{get_user_info_from_gql_ctx, resolve_jwt_to_user_info};
use crate::db::node_links::{get_first_link_under_parent, get_highest_order_key_under_parent, get_node_links, ChildGroup, ClaimForm, NodeLinkInput, Polarity};
use crate::db::node_links_::node_link_validity::assert_link_is_valid;
use crate::db::node_phrasings::NodePhrasing_Embedded;
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput};
use crate::db::nodes::get_node;
use crate::db::nodes_::_node::{ArgumentType, NodeInput};
use crate::db::nodes_::_node_type::NodeType;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::utils::general::order_key::OrderKey;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

use super::_command::{tbd, upsert_db_entry_by_id_for_struct, NoExtras};
use super::_shared::add_node::add_node;
use super::_shared::increment_edits::increment_edits_if_valid;
use super::add_child_node::{add_child_node, AddChildNodeInput};

wrap_slow_macros! {

#[derive(Default)] pub struct MutationShard_LinkNode;
#[Object] impl MutationShard_LinkNode {
	/// This is a higher-level wrapper around `addNodeLink`, which handles unlinking from old parent (if requested), etc.
	async fn link_node(&self, gql_ctx: &async_graphql::Context<'_>, input: LinkNodeInput, only_validate: Option<bool>) -> Result<LinkNodeResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, link_node);
	}
}

#[derive(InputObject, Serialize, Deserialize)]
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
	pub incrementEdits: Option<bool>,
}

#[derive(SimpleObject, Debug)]
pub struct LinkNodeResult {
	argumentWrapperID: Option<String>,
}

}

#[derive(Default)]
pub struct LinkNodeExtras {
	pub order_key_for_outer_node: Option<OrderKey>,
}

pub async fn link_node(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: LinkNodeInput, extras: LinkNodeExtras) -> Result<LinkNodeResult, Error> {
	let LinkNodeInput { mapID, oldParentID, newParentID, nodeID, childGroup, newForm, newPolarity, unlinkFromOldParent, deleteEmptyArgumentWrapper, incrementEdits } = input;
	let unlink_from_old_parent = unlinkFromOldParent.unwrap_or(false);
	let delete_empty_argument_wrapper = deleteEmptyArgumentWrapper.unwrap_or(false);

	let node_data = get_node(ctx, &nodeID).await?;
	//let old_parent = oldParentID.map_or(async { None }, |a| get_node(ctx, &a)).await?;
	let old_parent = if let Some(oldParentID) = &oldParentID { Some(get_node(ctx, oldParentID).await?) } else { None };
	let new_parent = get_node(ctx, &newParentID).await?;
	let order_key_for_outer_node = if let Some(order_key) = extras.order_key_for_outer_node {
		order_key
	} else {
		get_highest_order_key_under_parent(ctx, Some(&newParentID)).await?.next()?
	};

	assert_user_can_add_child(ctx, actor, &new_parent).await?; // defensive

	// if the new-parent-id is the same as the old-parent-id, then only allow the re-link to proceed if the child-group is changing
	if Some(&newParentID) == oldParentID.as_ref()
		&& let Some(old_parent) = &old_parent
	{
		let old_link = get_first_link_under_parent(ctx, &nodeID, old_parent.id.as_str()).await?;
		ensure!(childGroup != old_link.group, "Old-parent-id and new-parent-id cannot be the same! (unless changing child-group)");
	}

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
			ensure!(childGroup == ChildGroup::relevance || childGroup == ChildGroup::truth, "Claim is being linked under parent that requires a wrapper-argument, but the specified child-group ({childGroup:?}) is incompatible with that.");

			let new_polarity = newPolarity.unwrap_or(Polarity::supporting); // if new-polarity isn't supplied, just default to Supporting (this can happen if a claim is copied from search-results)
			let argument_wrapper = NodeInput {
				//accessPolicy: GetDefaultAccessPolicyID_ForNode(),
				accessPolicy: node_data.accessPolicy,
				r#type: NodeType::argument,
				argumentType: Some(ArgumentType::all),
				rootNodeForMap: None,
				multiPremiseArgument: None,
				//extras: json!({}),
				extras: CanOmit::None,
			};
			let argument_wrapper_revision = NodeRevisionInput { phrasing: NodePhrasing_Embedded { text_base: "".o(), ..Default::default() }, ..Default::default() };
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

			let result = add_child_node(
				ctx,
				actor,
				false,
				AddChildNodeInput {
					mapID: None,
					parentID: newParentID.o(),
					node: argument_wrapper,
					revision: argument_wrapper_revision,
					link: argument_wrapper_link,
					incrementEdits: Some(false),
				},
				Default::default(),
			)
			.await?;
			new_parent_id_for_claim = result.nodeID.clone();
			Some(result)
		},
	};

	let polarity = match node_data.r#type {
		NodeType::argument => Some(newPolarity.unwrap_or(Polarity::supporting)),
		NodeType::claim => newPolarity, // note: this case *should* only be happening for clients that are in "sl mode" (since debate-map standard doesn't want these claim->claim truth links)
		_ => None,
	};
	#[rustfmt::skip]
	add_node_link(ctx, actor, false, AddNodeLinkInput {
		//mapID,
		link: NodeLinkInput {
			parent: Some(new_parent_id_for_claim),
			child: Some(nodeID.o()),
			group: if wrapper_arg_needed { ChildGroup:: generic } else { childGroup },
			form: newForm,
			polarity,
			orderKey: if wrapper_arg_needed { OrderKey::mid() } else { order_key_for_outer_node },
			seriesAnchor: None,
			seriesEnd: None,
		},
	}, Default::default()).await?;

	if unlink_from_old_parent && let Some(old_parent) = old_parent {
		//let link = get_first_link_under_parent(ctx, &nodeID, old_parent.id.as_str()).await?;
		for link in get_node_links(ctx, Some(old_parent.id.as_str()), Some(nodeID.as_str())).await? {
			delete_node_link(ctx, actor, false, DeleteNodeLinkInput { mapID: None, id: link.id.to_string(), incrementEdits: Some(false) }, Default::default()).await?;
		}

		// if parent was argument, and it now has no children left, and the actor allows it (ie. their view has node as single-premise arg), then also delete the argument parent
		let new_child_count = get_node_links(ctx, Some(old_parent.id.as_str()), None).await?.len();
		if old_parent.r#type == NodeType::argument && new_child_count == 0 && delete_empty_argument_wrapper {
			delete_node(ctx, actor, false, DeleteNodeInput { mapID: None, nodeID: old_parent.id.to_string(), incrementEdits: Some(false) }, Default::default()).await?;
		}
	}

	increment_edits_if_valid(&ctx, Some(actor), mapID, is_root, incrementEdits).await?;

	Ok(LinkNodeResult { argumentWrapperID: add_arg_wrapper_result.map(|a| a.nodeID) })
}

pub fn is_wrapper_arg_needed_for_transfer(parent_type: NodeType, parent_child_group: ChildGroup, transfer_node_type: NodeType, transfer_node_child_group: Option<ChildGroup>) -> bool {
	let transfer_node_is_valid_already = assert_link_is_valid(parent_type, transfer_node_type, parent_child_group, None).is_ok();
	let wrapper_arg_would_be_valid_in_parent = assert_link_is_valid(parent_type, NodeType::argument, parent_child_group, None).is_ok();
	let transfer_node_can_be_placed_in_wrapper_arg = transfer_node_type == NodeType::claim && (transfer_node_child_group.is_none() || transfer_node_child_group == Some(ChildGroup::generic));
	!transfer_node_is_valid_already && wrapper_arg_would_be_valid_in_parent && transfer_node_can_be_placed_in_wrapper_arg
}
