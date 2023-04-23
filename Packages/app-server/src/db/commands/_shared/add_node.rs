use std::fmt::{Display, Formatter};

use rust_shared::anyhow::{anyhow, ensure, Context, Error};
use rust_shared::async_graphql::Object;
use rust_shared::async_graphql::{InputObject, SimpleObject, ID};
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::Deserialize;
use rust_shared::serde_json::{json, Value};
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{anyhow, async_graphql, serde_json, GQLError};
use tracing::info;

use crate::db::_shared::common_errors::err_should_be_null;
use crate::db::commands::_command::{command_boilerplate, tbd, upsert_db_entry_by_id_for_struct};
use crate::db::commands::_shared::increment_edit_counts::increment_edit_counts_if_valid;
use crate::db::commands::add_node_revision::{
    self, add_node_revision, AddNodeRevisionExtras, AddNodeRevisionInput, AddNodeRevisionResult,
};
use crate::db::general::sign_in_::jwt_utils::{
    get_user_info_from_gql_ctx, resolve_jwt_to_user_info,
};
use crate::db::map_node_edits::{ChangeType, MapNodeEdit};
use crate::db::node_revisions::{NodeRevision, NodeRevisionInput};
use crate::db::nodes_::_node::{Node, NodeInput};
use crate::db::nodes_::_node_type::NodeType;
use crate::db::users::User;
use crate::utils::db::accessors::AccessorContext;
use crate::utils::general::data_anchor::DataAnchorFor1;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;

#[derive(/*SimpleObject,*/ Debug)]
pub struct AddNodeResult {
    pub nodeID: String,
    pub revisionID: String,
}

/*#[derive(Default)]
pub struct AddNodeExtras {
    pub id_override: Option<bool>,
}*/

// in the future, this will very likely be a command present in the graphql api; until the use-case comes up though, we'll keep it as just a function
pub async fn add_node(
    ctx: &AccessorContext<'_>,
    actor: &User,
    node_: NodeInput,
    node_id_override: Option<String>,
    mut revision: NodeRevisionInput,
) -> Result<AddNodeResult, Error> {
    let revision_id = new_uuid_v4_as_b64();
    let node = Node {
        // set by server
        id: ID(node_id_override.unwrap_or(new_uuid_v4_as_b64())),
        creator: actor.id.to_string(),
        createdAt: time_since_epoch_ms_i64(),
        // pass-through
        accessPolicy: node_.accessPolicy,
        r#type: node_.r#type,
        rootNodeForMap: node_.rootNodeForMap,
        c_currentRevision: revision_id.clone(),
        multiPremiseArgument: node_.multiPremiseArgument,
        argumentType: node_.argumentType,
        //extras: node_.extras,
        extras: json!({}),
    };

    // validate the node, then add it to db
    validate_node(&node)?;
    upsert_db_entry_by_id_for_struct(&ctx, "nodes".to_owned(), node.id.to_string(), node.clone())
        .await?;

    // add node-revision to db
    ensure!(
        revision.node.is_none(),
        err_should_be_null("revision.node").to_string()
    );
    revision.node = Some(node.id.to_string());
    let add_rev_result = add_node_revision(
        ctx,
        actor,
        false,
        AddNodeRevisionInput {
            mapID: None,
            revision,
        },
        AddNodeRevisionExtras {
            id_override: Some(revision_id.clone()),
        },
    )
    .await?;
    ensure!(add_rev_result.id == revision_id, "The revision-id returned by add_node_revision didn't match the revision-id-override supplied to it!");

    Ok(AddNodeResult {
        nodeID: node.id.to_string(),
        revisionID: revision_id.to_string(),
    })
}

pub fn validate_node(node: &Node) -> Result<(), Error> {
    if node.multiPremiseArgument.is_some() {
        ensure!(node.r#type == NodeType::argument);
    }

    Ok(())
}
