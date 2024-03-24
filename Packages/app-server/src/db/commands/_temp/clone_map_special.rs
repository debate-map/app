use std::fmt::{Formatter, Display};

use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::indexmap::map;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, ensure, Context, Error};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::{info, warn};

use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::add_map::{add_map, AddMapInput};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
use crate::db::maps::{get_map, MapInput};
use crate::db::node_links::{get_node_links, ChildGroup, NodeLinkInput};
use crate::db::node_phrasings::NodePhrasing_Embedded;
use crate::db::node_revisions::{get_node_revision, NodeRevision, NodeRevisionInput};
use crate::db::nodes::{get_node, get_node_children};
use crate::db::nodes_::_node::{Node, NodeInput};
use crate::db::nodes_::_node_type::NodeType;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::order_key::OrderKey;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::super::_command::{upsert_db_entry_by_id_for_struct, NoExtras, tbd};
use super::super::_shared::add_node::add_node;
use super::super::_shared::increment_edit_counts::increment_edit_counts_if_valid;
use super::super::add_child_node::{add_child_node, AddChildNodeInput};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_CloneMapSpecial;
#[Object] impl MutationShard_CloneMapSpecial {
    async fn clone_map_special(&self, gql_ctx: &async_graphql::Context<'_>, input: CloneMapSpecialInput, only_validate: Option<bool>) -> Result<CloneMapSpecialResult, GQLError> {
        command_boilerplate!(gql_ctx, input, only_validate, clone_map_special);
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct CloneMapSpecialInput {
    pub mapID: String,
}

#[derive(SimpleObject, Debug)]
pub struct CloneMapSpecialResult {
    pub newMapID: String,
    pub doneAt: i64,
}

}

pub async fn clone_map_special(ctx: &AccessorContext<'_>, actor: &User, _is_root: bool, input: CloneMapSpecialInput, _extras: NoExtras) -> Result<CloneMapSpecialResult, Error> {
    let CloneMapSpecialInput { mapID } = input;

    let map = get_map(ctx, &mapID).await?;
    let new_map = MapInput {
        name: format!("Clone of {}", map.name),
        accessPolicy: map.accessPolicy,
        note: map.note.clone(),
        noteInline: map.noteInline,
        defaultExpandDepth: map.defaultExpandDepth,
        nodeAccessPolicy: map.nodeAccessPolicy.clone(),
        featured: map.featured,
        editors: map.editors.clone(),
        extras: json!({}),
    };
    let new_map_input = AddMapInput {map: new_map};
    let new_map_result = add_map(ctx, actor, false, new_map_input, Default::default()).await?;

    let root_node = get_node(ctx, &map.rootNode).await?;
    let new_root_node = get_node(ctx, &new_map_result.root_node_id).await?;

    clone_node_tree_special(ctx, actor, map.id.as_str(), root_node, new_root_node).await?;

    Ok(CloneMapSpecialResult {
        newMapID: new_map_result.id,
        doneAt: time_since_epoch_ms_i64(),
    })
}

pub async fn clone_node_tree_special(ctx: &AccessorContext<'_>, actor: &User, map_id: &str, old_node: Node, new_node: Node) -> Result<(), Error> {
    //let rev = get_node_revision(ctx, node.c_currentRevision.as_str()).await?;

    let links = get_node_links(ctx, Some(old_node.id.as_str()), None).await?;
    for link in links {
        let child = get_node(ctx, link.child.as_str()).await?;
        let child_rev = get_node_revision(ctx, child.c_currentRevision.as_str()).await?;

        // if child is an argument, try to "skip over it" during construction of map-clone (ie. to remove the sl-unwanted "intermediary node")
        if child.r#type == NodeType::argument {
            let grandchild_links = get_node_links(ctx, Some(child.id.as_str()), None).await?;
            // only "get rid of the intermediary argument" in cases where the "intermediary argument" has only 0-1 children
            if grandchild_links.len() <= 1 {
                // ensure that argument has no title, in any of the text_XXX fields
                let get_if_non_empty = |s: &Option<String>| {
                    match s {
                        Some(s) => match s {
                            s if s.is_empty() => None,
                            _ => Some(s.to_owned()),
                        },
                        None => None,
                    }
                };
                let first_non_empty_title =
                    get_if_non_empty(&Some(child_rev.phrasing.text_base))
                    .or(get_if_non_empty(&child_rev.phrasing.text_negation))
                    .or(get_if_non_empty(&child_rev.phrasing.text_question))
                    .or(get_if_non_empty(&child_rev.phrasing.text_narrative));
                if let Some(title) = first_non_empty_title {
                    warn!("Argument node #{} has a non-empty title. If this is a dry-run, it's recommended to investigate these entries before proceeding. @title:\n\t{}", child.id.as_str(), title);
                }

                // rather than add this argument itself, skip over it and add its children directly instead
                for grandchild_link in grandchild_links {
                    let grandchild = get_node(ctx, &grandchild_link.child).await?;
                    let grandchild_rev = get_node_revision(ctx, grandchild.c_currentRevision.as_str()).await?;
                    let add_child_input = AddChildNodeInput {
                        mapID: Some(map_id.o()),
                        parentID: new_node.id.as_str().o(),
                        node: grandchild.clone().into_input(true),
                        revision: grandchild_rev.into_input(false),
                        link: NodeLinkInput {
                            parent: None,
                            child: None,
                            group: match new_node.r#type {
                                NodeType::category => ChildGroup::generic,
                                _ => ChildGroup::freeform,
                            },
                            orderKey: link.orderKey.clone(), // use [old_node -> child] link's order-key, since that ordering is more meaningful
                            form: grandchild_link.form,
                            seriesAnchor: grandchild_link.seriesAnchor,
                            seriesEnd: grandchild_link.seriesEnd,
                            polarity: grandchild_link.polarity,
                        }
                    };
                    let add_node_result = add_child_node(ctx, actor, false, add_child_input, Default::default()).await?;
                    let new_node = get_node(ctx, &add_node_result.nodeID).await?;

                    Box::pin(clone_node_tree_special(ctx, actor, map_id, grandchild, new_node)).await?;
                }
                // we've done special processing for this argument node, so skip the generic processing below
                continue;
            }
        }

        let add_child_input = AddChildNodeInput {
            mapID: Some(map_id.o()),
            parentID: new_node.id.as_str().o(),
            node: child.clone().into_input(true),
            revision: child_rev.into_input(false),
            link: link.into_input(false),
        };
        let add_child_result = add_child_node(ctx, actor, false, add_child_input, Default::default()).await?;
        let new_child = get_node(ctx, &add_child_result.nodeID).await?;

        Box::pin(clone_node_tree_special(ctx, actor, map_id, child, new_child)).await?;
    }

    Ok(())
}