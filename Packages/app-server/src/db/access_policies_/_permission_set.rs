use std::panic;

use rust_shared::anyhow::{Error, anyhow};
use rust_shared::indexmap::IndexMap;
use rust_shared::serde_json::json;
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, SubError, serde, serde_json};
use rust_shared::async_graphql::{Context, Object, Schema, Subscription, ID, OutputType, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::tokio_postgres::{Client};
use rust_shared::tokio_postgres::Row;

use crate::utils::db::accessors::{get_db_entry, get_db_entries, AccessorContext};
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}, filter::{QueryFilter, FilterInput}}};

use super::super::commands::_command::FieldUpdate;

wrap_slow_macros!{

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "PermissionSetInput")]
pub struct PermissionSet {
    pub terms: PermissionSetForType,
    pub medias: PermissionSetForType,
    pub maps: PermissionSetForType,
    pub nodes: PermissionSetForType,
    // most node-related rows use their node's access-policy as their own; node-ratings is an exception, because individual entries can be kept hidden without disrupting collaboration significantly
    pub nodeRatings: PermissionSetForType,
}
impl PermissionSet {
    pub fn for_table(&self, table: APTable) -> PermissionSetForType {
        match table {
            APTable::terms => self.terms.clone(),
            APTable::medias => self.medias.clone(),
            APTable::maps => self.maps.clone(),
            APTable::nodes => self.nodes.clone(),
            APTable::nodeRatings => self.nodeRatings.clone(),
        }
    }
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "PermissionSetForTypeInput")]
pub struct PermissionSetForType {
    pub access: bool, // true = anyone, false = no-one
    pub modify: PermitCriteria,
    pub delete: PermitCriteria,

    // for nodes only
    // ==========

    pub vote: PermitCriteria,
    pub addPhrasing: PermitCriteria,
    // commented; users can always add "children" (however, governed maps can set a lens entry that hides unapproved children by default)
    //pub addChild: PermitCriteria,
}
impl PermissionSetForType {
    pub fn as_bool(&self, action: APAction) -> bool {
        match action {
            APAction::access => self.access,
            APAction::modify => self.modify.minApprovals != -1,
            APAction::delete => self.delete.minApprovals != -1,
            APAction::vote => self.vote.minApprovals != -1,
            APAction::addPhrasing => self.addPhrasing.minApprovals != -1,
            //APAction::AddChild => self.addChild.minApprovals != -1,
        }
    }
    /*pub fn as_criteria(&self, action: APAction) -> Result<PermitCriteria, Error> {
        match action {
            APAction::Access => Ok(PermitCriteria { minApprovals: 0, minApprovalPercent: 0 }),
            APAction::Modify => Ok(self.modify.clone()),
            APAction::Delete => Ok(self.delete.clone()),
            APAction::Vote => Ok(self.vote.clone()),
            APAction::AddPhrasing => Ok(self.addPhrasing.clone()),
            //APAction::AddChild => Ok(self.addChild.clone()),
        }
    }*/
}

#[derive(SimpleObject, InputObject, Clone, Serialize, Deserialize)]
#[graphql(input_name = "PermitCriteriaInput")]
pub struct PermitCriteria {
    pub minApprovals: i64, // 0 = anyone, -1 = no-one
    pub minApprovalPercent: i64, // 0 = anyone, -1 = no-one
}

// helper types (used only in this crate, ie. not exposed to graphql)
// ==========

/*#[derive(Debug, Clone, Copy, Deserialize)]
pub enum Table {
    AccessPolicies,
    Shares,
    GlobalData,
    Users,
    
    Feedback_Proposals,
    Feedback_UserInfos,

    Maps,
    Medias,
    Nodes,
    Terms,
    
    MapNodeEdits,
    NodeLinks,
    NodePhrasings,
    NodeRatings,
    NodeRevisions,
    NodeTags,
    UserHiddens,
    CommandRuns,
}*/

#[derive(Debug, Clone, Copy, Deserialize)]
pub enum APTable {
    maps,
    medias,
    terms,
    nodes,
    nodeRatings,
}
#[derive(Debug, Clone, Copy)]
pub enum APAction {
    access,
    modify,
    delete,
    vote,
    addPhrasing,
    //AddChild,
}

}