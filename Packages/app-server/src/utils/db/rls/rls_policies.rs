use rust_shared::{utils::{auth::jwt_utils_base::UserJWTData, general_::extensions::ToOwnedV}, anyhow::{bail, anyhow}, anyhow::Error};
use tracing::info;

use crate::{db::{terms::Term, access_policies::{get_access_policy}, map_node_edits::MapNodeEdit, user_hiddens::UserHidden, command_runs::CommandRun, node_tags::NodeTag, node_revisions::NodeRevision, node_ratings::NodeRating, node_phrasings::NodePhrasing, node_links::NodeLink, nodes_::_node::Node, maps::Map, medias::Media, feedback_proposals::Proposal, shares::Share, global_data::GlobalData, users::User, access_policies_::{_permission_set::{APAction, APTable}, _access_policy::AccessPolicy}, _shared::access_policy_target::AccessPolicyTarget}, links::db_live_cache::get_access_policy_cached};

use super::rls_helpers::{is_user_creator, does_policy_allow_access, do_policies_allow_access, is_user_admin, is_user_admin_or_creator};

// sync:sql[RLSPolicies.sql]

// empty policies (ie. can always be viewed by anyone) [these functions are not needed in sql version]
// ==========

pub fn check_access_for_access_policy() -> bool { true }
pub fn check_access_for_share() -> bool { true }
pub fn check_access_for_global_data() -> bool { true }
pub fn check_access_for_user() -> bool { true }

// likely to be removed at some point
// ----------

pub fn check_access_for_feedback_proposal() -> bool { true }
pub fn check_access_for_feedback_user_info() -> bool { true }

// simple RLS policies (where to access, it must be that: user is admin, user is creator, or entry's RLS policy allows access)
// ==========

pub fn check_access_for_map(user_id: Option<&str>, creator: &str, access_policy: &str) -> bool {
    is_user_admin_or_creator(user_id, creator) || does_policy_allow_access(user_id, access_policy, APTable::maps)
}
pub fn check_access_for_media(user_id: Option<&str>, creator: &str, access_policy: &str) -> bool {
    is_user_admin_or_creator(user_id, creator) || does_policy_allow_access(user_id, access_policy, APTable::medias)
}
pub fn check_access_for_node(user_id: Option<&str>, creator: &str, access_policy: &str) -> bool {
    is_user_admin_or_creator(user_id, creator) || does_policy_allow_access(user_id, access_policy, APTable::nodes)
}
pub fn check_access_for_term(user_id: Option<&str>, creator: &str, access_policy: &str) -> bool {
    is_user_admin_or_creator(user_id, creator) || does_policy_allow_access(user_id, access_policy, APTable::terms)
}

// derivative RLS policies (where to access, it must be that: user is admin, user is creator, or all of the associated RLS policies must pass)
// ==========

pub fn check_access_for_node_link(user_id: Option<&str>, creator: &str, accessPolicyTargets: &Vec<AccessPolicyTarget>) -> bool {
    is_user_admin_or_creator(user_id, creator) || do_policies_allow_access(user_id, accessPolicyTargets)
}
pub fn check_access_for_node_phrasing(user_id: Option<&str>, creator: &str, accessPolicyTargets: &Vec<AccessPolicyTarget>) -> bool {
    is_user_admin_or_creator(user_id, creator) || do_policies_allow_access(user_id, accessPolicyTargets)
}
pub fn check_access_for_node_rating(user_id: Option<&str>, creator: &str, accessPolicyTargets: &Vec<AccessPolicyTarget>) -> bool {
    is_user_admin_or_creator(user_id, creator) || do_policies_allow_access(user_id, accessPolicyTargets)
}
pub fn check_access_for_node_revision(user_id: Option<&str>, creator: &str, accessPolicyTargets: &Vec<AccessPolicyTarget>) -> bool {
    is_user_admin_or_creator(user_id, creator) || do_policies_allow_access(user_id, accessPolicyTargets)
}
pub fn check_access_for_node_tag(user_id: Option<&str>, creator: &str, accessPolicyTargets: &Vec<AccessPolicyTarget>) -> bool {
    is_user_admin_or_creator(user_id, creator) || do_policies_allow_access(user_id, accessPolicyTargets)
}

// unique RLS policies
// ==========

pub fn check_access_for_map_node_edit(user_id: Option<&str>, /*creator: &str,*/ accessPolicyTargets: &Vec<AccessPolicyTarget>) -> bool {
    //is_user_admin_or_creator(user_id, creator) || do_policies_allow_access(user_id, accessPolicyTargets)
    is_user_admin(user_id) || do_policies_allow_access(user_id, accessPolicyTargets)
}

pub fn check_access_for_user_hidden(user_id: Option<&str>, user_hidden_id: &str) -> bool {
    is_user_admin(user_id) || user_id == Some(user_hidden_id)
}

pub fn check_access_for_command_run(user_id: Option<&str>, public_base: bool, accessPolicyTargets: &Vec<AccessPolicyTarget>) -> bool {
    is_user_admin(user_id) || (
        // public_base = true, iff the Command class has "canShowInStream" enabled, and the user has "addToStream" enabled (see CommandMacros/General.ts)
        public_base
        && do_policies_allow_access(user_id, accessPolicyTargets)
    )
}