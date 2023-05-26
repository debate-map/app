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
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use rust_shared::serde::{Serialize, Deserialize};
use tracing::info;

use crate::db::_shared::path_finder::search_up_from_node_for_node_matching_x;
use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::add_node_link::{AddNodeLinkInput, add_node_link};
use crate::db::commands::delete_node::{delete_node, DeleteNodeInput};
use crate::db::commands::delete_node_link::{self, delete_node_link, DeleteNodeLinkInput};
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
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras, tbd, gql_placeholder};
use super::_shared::add_node::add_node;
use super::_shared::increment_edit_counts::increment_edit_counts_if_valid;
use super::add_child_node::{add_child_node, AddChildNodeInput};
use super::add_node_link::assert_link_is_valid;
use super::transfer_nodes_::transfer_using_clone::TransferResult_Clone;
use super::transfer_nodes_::transfer_using_shim::TransferResult_Shim;
use super::transfer_nodes_::{transfer_using_clone::transfer_using_clone, transfer_using_shim::transfer_using_shim};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_TransferNodes;
#[Object] impl MutationShard_TransferNodes {
	/// This is a higher-level wrapper around `addNodeLink`, which handles unlinking from old parent (if requested), etc.
	async fn transfer_nodes(&self, gql_ctx: &async_graphql::Context<'_>, input: TransferNodesInput, only_validate: Option<bool>) -> Result<TransferNodesResult, GQLError> {
		command_boilerplate!(gql_ctx, input, only_validate, transfer_nodes);
    }
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct TransferNodesInput {
	pub mapID: Option<String>,
	pub nodes: Vec<NodeInfoForTransfer>,
}

#[derive(InputObject, Serialize, Deserialize)]
pub struct NodeInfoForTransfer {
	pub nodeID: Option<String>, // can be null, if transfer is of type "shim"
	pub oldParentID: Option<String>,
	pub transferType: TransferType,
    #[graphql(name = "clone_newType")]
	pub clone_newType: NodeType,
    #[graphql(name = "clone_keepChildren")]
	pub clone_keepChildren: bool,
    #[graphql(name = "clone_keepTags")]
	pub clone_keepTags: NodeTagCloneType,

	pub newParentID: Option<String>,
	pub newAccessPolicyID: Option<String>,
	pub childGroup: ChildGroup,
	pub claimForm: Option<ClaimForm>,
	pub argumentPolarity: Option<Polarity>,
}

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash, Debug)]
pub enum TransferType {
	#[graphql(name = "ignore")] ignore,
	#[graphql(name = "move")] r#move,
	#[graphql(name = "link")] link,
	#[graphql(name = "clone")] clone,
	#[graphql(name = "shim")] shim,
}

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash, Debug)]
pub enum NodeTagCloneType {
	#[graphql(name = "minimal")] minimal,
	#[graphql(name = "basics")] basics,
	//#[graphql(name = "full")] full,
}

#[derive(SimpleObject, Debug)]
pub struct TransferNodesResult {
	#[graphql(name = "_useTypenameFieldInstead")] __: String,
}

}

pub enum TransferResult {
    Ignore,
    Clone(TransferResult_Clone),
    Shim(TransferResult_Shim),
}

pub async fn transfer_nodes(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: TransferNodesInput, _extras: NoExtras) -> Result<TransferNodesResult, Error> {
	let TransferNodesInput { mapID, nodes } = input;

    let mut transfer_results: Vec<TransferResult> = vec![];
	
	for (i, transfer) in nodes.iter().enumerate() {
        //let _prev_transfer = nodes.get(i - 1);
        //let prev_transfer_result = i.checked_sub(1).and_then(|i| transfer_results.get(i));
        let prev_transfer_result = if i == 0 { None } else { transfer_results.get(i - 1) };
        
        let node_id = transfer.nodeID.as_ref().ok_or(anyhow!("For any transfer type, nodeID must be specified."))?;

        let result = match transfer.transferType {
            TransferType::ignore => TransferResult::Ignore,
            TransferType::r#move => bail!("Not yet implemented."),
            TransferType::link => bail!("Not yet implemented."),
            TransferType::clone => transfer_using_clone(ctx, actor, transfer, prev_transfer_result, node_id).await?,
            TransferType::shim => transfer_using_shim(ctx, actor, transfer, prev_transfer_result, node_id).await?,
        };
        transfer_results.push(result);
    }
	
	increment_edit_counts_if_valid(&ctx, Some(actor), mapID, is_root).await?;

	Ok(TransferNodesResult { __: gql_placeholder() })
}