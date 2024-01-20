use std::fmt::{Formatter, Display};

use rust_shared::indexmap::IndexSet;
use rust_shared::async_graphql::{ID, SimpleObject, InputObject, Enum};
use rust_shared::itertools::Itertools;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError, to_anyhow};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, Context, ensure, bail};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use rust_shared::serde::{Serialize, Deserialize};
use tracing::info;

use crate::db::_shared::path_finder::search_up_from_node_for_node_matching_x;
use crate::db::commands::_command::{command_boilerplate, CanOmit};
use crate::db::commands::add_node_link::{AddNodeLinkInput, add_node_link};
use crate::db::commands::add_node_tag::{add_node_tag, AddNodeTagInput};
use crate::db::commands::delete_node::{delete_node, DeleteNodeInput};
use crate::db::commands::delete_node_link::{self, delete_node_link, DeleteNodeLinkInput};
use crate::db::commands::link_node::{link_node, LinkNodeInput};
use crate::db::commands::transfer_nodes::{NodeInfoForTransfer, TransferResult, NodeTagCloneType};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::node_links::{NodeLinkInput, ClaimForm, ChildGroup, Polarity, get_node_links, get_first_link_under_parent, get_highest_order_key_under_parent, NodeLink};
use crate::db::node_phrasings::NodePhrasing_Embedded;
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput, get_node_revision};
use crate::db::node_tags::{NodeTag, get_node_tags, NodeTagInput, TagComp_CloneHistory};
use crate::db::nodes::get_node;
use crate::db::nodes_::_node::{NodeInput, ArgumentType, Node};
use crate::db::nodes_::_node_type::{NodeType, get_node_type_info};
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::order_key::OrderKey;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::super::_command::{upsert_db_entry_by_id_for_struct, NoExtras, tbd, gql_placeholder};
use super::super::_shared::add_node::add_node;
use super::super::_shared::increment_edit_counts::increment_edit_counts_if_valid;
use super::super::add_child_node::{add_child_node, AddChildNodeInput};
use super::super::add_node_link::assert_link_is_valid;
use super::transfer_using_shim::TransferResult_Shim;

pub struct TransferResult_Clone {
    pub new_node_id: String,
}

pub async fn transfer_using_clone(ctx: &AccessorContext<'_>, actor: &User, transfer: &NodeInfoForTransfer, prev_transfer_result: Option<&TransferResult>, node_id: &str) -> Result<TransferResult, Error> {
    let node = get_node(&ctx, node_id).await?;

    let old_parent_id = transfer.oldParentID.clone().ok_or(anyhow!("Transfer-using-clone requires oldParentID to be specified."))?; // maybe relax this requirement later
    let new_parent_id = if let Some(new_parent_id) = &transfer.newParentID {
        let _new_parent = get_node(ctx, new_parent_id).await.with_context(|| "New-parent-id specifies a node that doesn't exist!")?;
        new_parent_id.o()
    } else {
        match prev_transfer_result {
            Some(TransferResult::Shim(TransferResult_Shim { new_argument_wrapper_id })) => new_argument_wrapper_id.clone(),
            _ => bail!("Could not determine the new-parent-id for this transfer-using-clone operation!"),
        }
    };

    let new_node = NodeInput {
        r#type: transfer.clone_newType, //.unwrap_or(node.r#type),
        accessPolicy: transfer.newAccessPolicyID.clone().unwrap_or(node.accessPolicy),
        rootNodeForMap: node.rootNodeForMap,
        multiPremiseArgument: node.multiPremiseArgument,
        argumentType: node.argumentType,
        //extras: json!({}),
        extras: CanOmit::None,
    };

    let rev = get_node_revision(ctx, &node.c_currentRevision).await?;
    let new_rev = NodeRevisionInput {
        node: None,
        phrasing: rev.phrasing,
        displayDetails: rev.displayDetails,
        attachments: rev.attachments,
    };

    let link = get_first_link_under_parent(ctx, node_id, &old_parent_id).await?;
    let order_key_for_new_node = get_highest_order_key_under_parent(ctx, Some(&new_parent_id)).await?.next()?;
    let new_link = NodeLinkInput {
        group: transfer.childGroup,
        orderKey: order_key_for_new_node,
        parent: None,
        child: None,
        form: link.form,
        seriesAnchor: link.seriesAnchor,
        seriesEnd: link.seriesEnd,
        polarity: if new_node.r#type == NodeType::argument {
            Some(transfer.argumentPolarity.unwrap_or(Polarity::supporting))
        } else {
            link.polarity
        },
    };

    let add_child_node_input = AddChildNodeInput {
        mapID: None,
        parentID: new_parent_id,
        node: new_node.clone(),
        revision: new_rev,
        link: new_link,
    };
    let add_child_node_result = add_child_node(ctx, actor, false, add_child_node_input, Default::default()).await?;
    let new_node_id = add_child_node_result.nodeID;

    if transfer.clone_keepChildren {
        let old_child_links = get_node_links(&ctx, Some(node_id), None).await?;
        for link in &old_child_links {
            // hard-coded exception here: if old-node-type is category (with claim children), and new-node-type is claim, then have children claims be wrapped into argument nodes
            if node.r#type == NodeType::category && new_node.r#type == NodeType::claim && link.c_childType == NodeType::claim {
                link_node(&ctx, actor, false, LinkNodeInput {
                    mapID: None,
                    oldParentID: Some(link.parent.clone()),
                    newParentID: new_node_id.clone(),
                    childGroup: ChildGroup::truth,
                    nodeID: link.child.clone(),
                    newForm: link.form.clone(),
                    newPolarity: link.polarity.clone(),
                    deleteEmptyArgumentWrapper: Some(false),
                    unlinkFromOldParent: Some(false),
                }, Default::default()).await?;
                continue;
            }
            
            let new_link = NodeLinkInput {
                parent: Some(new_node_id.clone()),
                child: Some(link.child.clone()),
                // if we're changing the node's type, check for child-links it has that are invalid (eg. wrong child-group), and try to change them to be valid
                group: if new_node.r#type != node.r#type && assert_link_is_valid(new_node.r#type, link.group, link.c_childType).is_ok() {
                    let first_valid_group_for_child_type = get_node_type_info(new_node.r#type).childGroup_childTypes.iter().find(|a| a.1.contains(&link.c_childType));
                    match first_valid_group_for_child_type {
                        None => bail!("Cannot clone node while both changing type and keeping children, because there are children whose type ({:?}) cannot be placed into any of the new node's child-groups.", link.c_childType),
                        Some((group, _)) => group.clone(),
                    }
                } else {
                    link.group
                },
                orderKey: link.orderKey.o(),
                form: link.form,
                seriesAnchor: link.seriesAnchor,
                seriesEnd: link.seriesEnd,
                polarity: link.polarity,
            };
            add_node_link(&ctx, actor, false, AddNodeLinkInput { link: new_link }, Default::default()).await?;
        }
    }

    let tags = get_node_tags(&ctx, node_id).await?;
    for tag in &tags {
        let new_tag = maybe_clone_and_retarget_node_tag(tag, transfer.clone_keepTags, node_id, &new_node_id);
        if let Some(new_tag) = new_tag {
            add_node_tag(&ctx, actor, false, AddNodeTagInput { tag: new_tag.to_input() }, Default::default()).await?;
        }
    }

    let tags_showing_clone_history_for_old_node = tags.iter().filter(|tag| {
        if let Some(history) = &tag.cloneHistory && history.cloneChain.last() == Some(&node_id.o()) {
            true
        } else {
            false
        }
    }).collect_vec();
    // if there was no clone-history tag we could extend to record this clone action, create a brand new clone-history tag for it
    if tags_showing_clone_history_for_old_node.len() == 0 {
        let new_nodes = vec![node_id.o(), new_node_id.o()];
        let new_clone_history = TagComp_CloneHistory { cloneChain: new_nodes.clone() };
        add_node_tag(&ctx, actor, false, AddNodeTagInput {
            tag: NodeTagInput {
                nodes: new_nodes,
                cloneHistory: Some(new_clone_history),
                ..Default::default()
            }
        }, Default::default()).await?;
    }

    Ok(TransferResult::Clone(TransferResult_Clone {
        new_node_id,
    }))
}

fn maybe_clone_and_retarget_node_tag(tag: &NodeTag, clone_type: NodeTagCloneType, old_node_id: &str, new_node_id: &str) -> Option<NodeTag> {
    let tag_clone_level = match clone_type {
        NodeTagCloneType::minimal => 0,
        NodeTagCloneType::basics => 1,
    };

    let mut new_tag = tag.clone();
    if let Some(labels) = new_tag.labels.as_mut() && tag_clone_level >= 1 {
        labels.nodeX = new_node_id.o();
    }
    // clone-history tags are a special case: clone+extend them if-and-only-if the result/final-entry is the old-node (preserving history without creating confusion)
    else if let Some(history) = new_tag.cloneHistory.as_mut() && history.cloneChain.last() == Some(&old_node_id.o()) {
        history.cloneChain.push(new_node_id.o());
    } else {
        return None;
    }

    new_tag.nodes = new_tag.calculate_new_nodes_list();
    Some(new_tag)
}