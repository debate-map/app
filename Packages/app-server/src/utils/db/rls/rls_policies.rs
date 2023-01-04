use rust_shared::{utils::{auth::jwt_utils_base::UserJWTData, general_::extensions::ToOwnedV}, anyhow::bail};

use crate::db::{terms::Term, access_policies::{get_access_policy, AccessPolicy}, map_node_edits::MapNodeEdit, user_hiddens::UserHidden, command_runs::CommandRun, node_tags::NodeTag, node_revisions::NodeRevision, node_ratings::NodeRating, node_phrasings::NodePhrasing, node_links::NodeLink, nodes_::_node::Node, maps::Map, medias::Media, feedback_proposals::Proposal, shares::Share, global_data::GlobalData, users::User};

use super::rls_helpers::{is_user_creator, does_policy_allow_access, do_policies_allow_access, is_user_admin};

// sync:sql[RLSPolicies.sql]

pub trait UsesRLS {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool;
}

// empty policies (ie. can always be viewed by anyone) [these functions are not needed in sql version]
// ==========

impl UsesRLS for AccessPolicy {
    fn does_entry_pass_rls(&self, _jwt_data: &Option<UserJWTData>) -> bool { true }
}
impl UsesRLS for Share {
    fn does_entry_pass_rls(&self, _jwt_data: &Option<UserJWTData>) -> bool { true }
}
impl UsesRLS for GlobalData {
    fn does_entry_pass_rls(&self, _jwt_data: &Option<UserJWTData>) -> bool { true }
}
impl UsesRLS for User {
    fn does_entry_pass_rls(&self, _jwt_data: &Option<UserJWTData>) -> bool { true }
}

// likely to be removed at some point
impl UsesRLS for Proposal {
    fn does_entry_pass_rls(&self, _jwt_data: &Option<UserJWTData>) -> bool { true }
}
impl UsesRLS for crate::db::feedback_user_infos::UserInfo {
    fn does_entry_pass_rls(&self, _jwt_data: &Option<UserJWTData>) -> bool { true }
}

// simple RLS policies (where to access, it must be that: user is creator, user is admin, entry's policy allows general access [without user-specific block], or entry's policy has user-specific grant)
// ==========

impl UsesRLS for Term {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || is_user_creator(jwt_data, self.creator) || does_policy_allow_access(jwt_data, &self.accessPolicy, "terms")
    }
}
impl UsesRLS for Media {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || is_user_creator(jwt_data, self.creator) || does_policy_allow_access(jwt_data, &self.accessPolicy, "medias")
    }
}
impl UsesRLS for Map {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || is_user_creator(jwt_data, self.creator) || does_policy_allow_access(jwt_data, &self.accessPolicy, "maps")
    }
}
impl UsesRLS for Node {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || is_user_creator(jwt_data, self.creator) || does_policy_allow_access(jwt_data, &self.accessPolicy, "nodes")
    }
}

// derivative RLS policies (where to access an entry, the RLS policies of its associated objects must all pass)
// ==========

impl UsesRLS for MapNodeEdit {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || do_policies_allow_access(jwt_data, self.c_accessPolicyTargets)
    }
}
impl UsesRLS for NodeLink {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || do_policies_allow_access(jwt_data, self.c_accessPolicyTargets)
    }
}
impl UsesRLS for NodePhrasing {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || do_policies_allow_access(jwt_data, self.c_accessPolicyTargets)
    }
}
impl UsesRLS for NodeRating {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || is_user_creator(jwt_data, self.creator) || do_policies_allow_access(jwt_data, self.c_accessPolicyTargets)
    }
}
impl UsesRLS for NodeRevision {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || do_policies_allow_access(jwt_data, self.c_accessPolicyTargets)
    }
}
impl UsesRLS for NodeTag {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || do_policies_allow_access(jwt_data, self.c_accessPolicyTargets)
    }
}

// unique RLS policies
// ==========

impl UsesRLS for UserHidden {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || jwt_data.as_ref().map(|a| a.id.o()) == Some(self.id.to_string())
    }
}
impl UsesRLS for CommandRun {
    fn does_entry_pass_rls(&self, jwt_data: &Option<UserJWTData>) -> bool {
        is_user_admin(jwt_data) || (
            // public_base = true, iff the Command class has "canShowInStream" enabled, and the user has "addToStream" enabled (see CommandMacros/General.ts)
            self.public_base
            && do_policies_allow_access(jwt_data, self.c_accessPolicyTargets)
        )
    }
}