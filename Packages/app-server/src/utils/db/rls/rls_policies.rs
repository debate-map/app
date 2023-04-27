use rust_shared::{utils::{auth::jwt_utils_base::UserJWTData, general_::extensions::ToOwnedV}, anyhow::{bail, anyhow}, anyhow::Error};
use tracing::info;

use crate::{db::{terms::Term, access_policies::{get_access_policy}, map_node_edits::MapNodeEdit, user_hiddens::UserHidden, command_runs::CommandRun, node_tags::NodeTag, node_revisions::NodeRevision, node_ratings::NodeRating, node_phrasings::NodePhrasing, node_links::NodeLink, nodes_::_node::Node, maps::Map, medias::Media, feedback_proposals::Proposal, shares::Share, global_data::GlobalData, users::User, access_policies_::{_permission_set::{APAction, APTable}, _access_policy::AccessPolicy}, _shared::access_policy_target::AccessPolicyTarget, timelines::Timeline, timeline_steps::TimelineStep}, links::db_live_cache::get_access_policy_cached};

use super::rls_helpers::{is_user_creator, does_policy_allow_access, do_policies_allow_access, is_user_admin, is_user_admin_or_creator};

// sync:sql[RLSPolicies.sql]
pub trait UsesRLS {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool;
}

// empty policies (ie. can always be viewed by anyone) [these functions are not needed in sql version]
// ==========

impl UsesRLS for AccessPolicy {
    fn can_access_cached(&self, _user_id: Option<&str>) -> bool { true }
}
impl UsesRLS for Share {
    fn can_access_cached(&self, _user_id: Option<&str>) -> bool { true }
}
impl UsesRLS for GlobalData {
    fn can_access_cached(&self, _user_id: Option<&str>) -> bool { true }
}
impl UsesRLS for User {
    fn can_access_cached(&self, _user_id: Option<&str>) -> bool { true }
}

// likely to be removed at some point
impl UsesRLS for Proposal {
    fn can_access_cached(&self, _user_id: Option<&str>) -> bool { true }
}
impl UsesRLS for crate::db::feedback_user_infos::UserInfo {
    fn can_access_cached(&self, _user_id: Option<&str>) -> bool { true }
}

// simple RLS policies (where to access, it must be that: user is creator, user is admin, entry's policy allows general access [without user-specific block], or entry's policy has user-specific grant)
// ==========

impl UsesRLS for Term {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || does_policy_allow_access(user_id, &self.accessPolicy, APTable::terms)
    }
}
impl UsesRLS for Media {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || does_policy_allow_access(user_id, &self.accessPolicy, APTable::medias)
    }
}
impl UsesRLS for Map {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || does_policy_allow_access(user_id, &self.accessPolicy, APTable::maps)
    }
}
impl UsesRLS for Node {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || does_policy_allow_access(user_id, &self.accessPolicy, APTable::nodes)
    }
}
impl UsesRLS for Timeline {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || does_policy_allow_access(user_id, &self.accessPolicy, APTable::others)
    }
}

// derivative RLS policies (where to access an entry, the RLS policies of its associated objects must all pass)
// ==========

impl UsesRLS for NodeLink {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || do_policies_allow_access(user_id, &self.c_accessPolicyTargets)
    }
}
impl UsesRLS for NodePhrasing {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || do_policies_allow_access(user_id, &self.c_accessPolicyTargets)
    }
}
impl UsesRLS for NodeRating {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || is_user_creator(user_id, &self.creator) || do_policies_allow_access(user_id, &self.c_accessPolicyTargets)
    }
}
impl UsesRLS for NodeRevision {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        //info!("Test1 @is_user_admin:{} @do_policies_allow_access:{}", is_user_admin(user_id), do_policies_allow_access(user_id, &self.c_accessPolicyTargets));
        is_user_admin_or_creator(user_id, &self.creator) || do_policies_allow_access(user_id, &self.c_accessPolicyTargets)
    }
}
impl UsesRLS for NodeTag {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || do_policies_allow_access(user_id, &self.c_accessPolicyTargets)
    }
}
impl UsesRLS for TimelineStep {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin_or_creator(user_id, &self.creator) || do_policies_allow_access(user_id, &self.c_accessPolicyTargets)
    }
}

// unique RLS policies
// ==========

impl UsesRLS for MapNodeEdit {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        //is_user_admin_or_creator(user_id, creator) || do_policies_allow_access(user_id, accessPolicyTargets)
        is_user_admin(user_id) || do_policies_allow_access(user_id, &self.c_accessPolicyTargets)
    }
}
impl UsesRLS for UserHidden {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin(user_id) || user_id == Some(self.id.as_str())
    }
}
impl UsesRLS for CommandRun {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool {
        is_user_admin(user_id) || (
            // public_base = true, iff the Command class has "canShowInStream" enabled, and the user has "addToStream" enabled (see CommandMacros/General.ts)
            self.public_base
            && do_policies_allow_access(user_id, &self.c_accessPolicyTargets)
        )
    }
}