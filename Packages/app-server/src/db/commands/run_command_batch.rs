use std::fmt::{Formatter, Display};

use rust_shared::async_graphql::{ID, SimpleObject, InputObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::general_::serde::to_json_value_for_borrowed_obj;
use rust_shared::{async_graphql, serde_json, anyhow, GQLError, to_anyhow};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error, Context, ensure, bail};
use rust_shared::utils::time::{time_since_epoch_ms_i64};
use rust_shared::serde::{Serialize, Deserialize};
use tracing::info;

use crate::db::commands::_command::command_boilerplate;
use crate::db::commands::_shared::increment_edit_counts::increment_edit_counts_if_valid;
use crate::db::commands::_shared::record_command_run::record_command_run;
use crate::db::commands::add_node_link::{add_node_link, AddNodeLinkInput};
use crate::db::general::permission_helpers::{assert_user_can_add_phrasing, assert_user_can_add_child};
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

use super::_command::{upsert_db_entry_by_id_for_struct, NoExtras, tbd};
use super::_shared::add_node::add_node;
use super::add_child_node::{AddChildNodeInput, add_child_node, AddChildNodeExtras};

wrap_slow_macros!{

#[derive(Default)] pub struct MutationShard_RunCommandBatch;
#[Object] impl MutationShard_RunCommandBatch {
    async fn run_command_batch(&self, gql_ctx: &async_graphql::Context<'_>, input: RunCommandBatchInput, only_validate: Option<bool>) -> Result<RunCommandBatchResult, GQLError> {
        command_boilerplate!(gql_ctx, input, only_validate, run_command_batch);
    }

    // todo: probably add another version of run-command-batch that works in "streaming mode", ie. using a graphql "subscription" to let the caller know how the batch's execution is progressing
}

#[derive(InputObject, Deserialize, Serialize, Clone)]
pub struct RunCommandBatchInput {
    pub commands: Vec<CommandEntry>,
}

#[derive(InputObject, Deserialize, Serialize, Clone)]
pub struct CommandEntry {
    pub addChildNode: Option<AddChildNodeInput>,

    // extras
    pub setParentNodeToResultOfCommandAtIndex: Option<usize>, // used by: addChildNode
}

#[derive(SimpleObject, Debug, Serialize)]
pub struct RunCommandBatchResult {
    pub results: Vec<JSONValue>,
}

}

pub async fn run_command_batch(ctx: &AccessorContext<'_>, actor: &User, is_root: bool, input: RunCommandBatchInput, _extras: NoExtras) -> Result<RunCommandBatchResult, Error> {
    let RunCommandBatchInput { commands } = input.clone();
    
    let mut command_results: Vec<JSONValue> = Vec::new();
    for (index, command) in commands.iter().enumerate() {
        if let Some(command_input) = &command.addChildNode {
            let mut command_input_final = command_input.clone();

            // allow add-child-node commands to set some of their fields based on the results of prior commands in the batch (eg. for importing a tree of nodes)
            if let Some(parent_source_index) = command.setParentNodeToResultOfCommandAtIndex {
                let earlier_command = commands.get(parent_source_index).ok_or_else(|| anyhow!("Command #{} referred to a command index that doesn't exist.", index))?;
                let earlier_command_result = command_results.get(parent_source_index as usize).ok_or_else(|| anyhow!("Command #{} referred to a command-result index that doesn't yet exist.", index))?;
                if earlier_command.addChildNode.is_some() {
                    let earlier_command_result_node_id = earlier_command_result.get("nodeID").and_then(|a| a.as_str()).ok_or_else(|| anyhow!("Add-child-node command's result (index #{}) lacks a nodeID field!", index))?;
                    command_input_final.parentID = earlier_command_result_node_id.to_owned();
                } else {
                    bail!("Command #{} referred to a command index that doesn't have a recognized subfield.", index);
                }
            }

            let result = add_child_node(ctx, actor, is_root, command_input_final, AddChildNodeExtras { avoid_recording_command_run: true, avoid_incrementing_edit_counts: true }).await?;
            command_results.push(serde_json::to_value(result)?);
        } else {
            bail!("Command #{} had no recognized command subfield.", index);
        }
    }
    
    Ok(RunCommandBatchResult { results: command_results })
}