use std::fmt::{Formatter, Display};

use rust_shared::async_graphql::{ID, SimpleObject, InputObject, Enum};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError, to_anyhow};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, Context, ensure, bail};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::info;

use crate::db::_shared::path_finder::search_up_from_node_for_node_matching_x;
use crate::db::commands::_command::{command_boilerplate, CanOmit};
use crate::db::commands::add_node_link::{AddNodeLinkInput, add_node_link};
use crate::db::commands::delete_node::{delete_node, DeleteNodeInput};
use crate::db::commands::delete_node_link::{self, delete_node_link, DeleteNodeLinkInput};
use crate::db::commands::transfer_nodes::{NodeInfoForTransfer, TransferResult};
use crate::db::general::sign_in_::jwt_utils::{resolve_jwt_to_user_info, get_user_info_from_gql_ctx};
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

use super::super::_command::{upsert_db_entry_by_id_for_struct, NoExtras, tbd, gql_placeholder};
use super::super::_shared::add_node::add_node;
use super::super::_shared::increment_edit_counts::increment_edit_counts_if_valid;
use super::super::add_child_node::{add_child_node, AddChildNodeInput};
use super::super::add_node_link::assert_link_is_valid;

pub struct TransferResult_Shim {
    pub new_argument_wrapper_id: String,
}

pub async fn transfer_using_shim(ctx: &AccessorContext<'_>, actor: &User, transfer: &NodeInfoForTransfer, _prev_transfer_result: Option<&TransferResult>, node_id: &str) -> Result<TransferResult, Error> {
    let node = get_node(&ctx, node_id).await?;
    let new_parent_id = transfer.newParentID.clone().ok_or(anyhow!("For transfer of type \"shim\", newParentID must be specified."))?;
    let order_key_for_new_node = get_highest_order_key_under_parent(&ctx, Some(&new_parent_id)).await?.next()?;

    let argument_wrapper = NodeInput {
        accessPolicy: transfer.newAccessPolicyID.clone().unwrap_or(node.accessPolicy),
        r#type: NodeType::argument,
        rootNodeForMap: None,
        multiPremiseArgument: None,
        argumentType: Some(ArgumentType::all),
        //extras: json!({}),
        extras: CanOmit::None,
    };
    let argument_wrapper_revision = NodeRevisionInput {
        phrasing: NodePhrasing_Embedded { text_base: "".o(), ..Default::default() },
        // defaults
        node: None, displayDetails: None, attachments: vec![],
    };

    let add_child_node_input = AddChildNodeInput {
        mapID: None,
        parentID: new_parent_id,
        node: argument_wrapper,
        revision: argument_wrapper_revision,
        link: NodeLinkInput {
            group: transfer.childGroup,
            orderKey: order_key_for_new_node,
            polarity: Some(transfer.argumentPolarity.unwrap_or(Polarity::supporting)),
            // defaults
            parent: None, child: None, form: None, seriesAnchor: None, seriesEnd: None,
        },
    };
    let result = add_child_node(&ctx, actor, false, add_child_node_input, Default::default()).await?;

    Ok(TransferResult::Shim(TransferResult_Shim {
        new_argument_wrapper_id: result.nodeID,
    }))
}