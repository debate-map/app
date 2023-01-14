use rust_shared::{utils::{auth::jwt_utils_base::UserJWTData, general_::extensions::ToOwnedV}, anyhow::{bail, anyhow}, anyhow::Error};
use tracing::info;

use crate::{db::{terms::Term, access_policies::{get_access_policy}, map_node_edits::MapNodeEdit, user_hiddens::UserHidden, command_runs::CommandRun, node_tags::NodeTag, node_revisions::NodeRevision, node_ratings::NodeRating, node_phrasings::NodePhrasing, node_links::NodeLink, nodes_::_node::Node, maps::Map, medias::Media, feedback_proposals::Proposal, shares::Share, global_data::GlobalData, users::User, access_policies_::{_permission_set::{APAction, APTable}, _access_policy::AccessPolicy}, _shared::access_policy_target::AccessPolicyTarget, nodes::get_node, general::permission_helpers::is_user_admin}, links::db_live_cache::get_access_policy_cached, utils::db::accessors::AccessorContext};

use crate::utils::db::rls::{rls_policies::{check_access_for_access_policy, check_access_for_share, check_access_for_global_data, check_access_for_user, check_access_for_feedback_proposal, check_access_for_feedback_user_info, check_access_for_map, check_access_for_media, check_access_for_node, check_access_for_term, check_access_for_node_link, check_access_for_node_phrasing, check_access_for_node_rating, check_access_for_node_revision, check_access_for_node_tag, check_access_for_map_node_edit, check_access_for_user_hidden, check_access_for_command_run}};

pub trait UsesRLS {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool;
    //async fn can_access(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;
    /*async fn can_vote(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;
    async fn can_add_phrasing(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;*/
}

// empty policies (ie. can always be viewed by anyone) [these functions are not needed in sql version]
// ==========

impl UsesRLS for AccessPolicy {
	fn can_access_cached(&self, _user_id: Option<&str>) -> bool { check_access_for_access_policy() }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl UsesRLS for Share {
	fn can_access_cached(&self, _user_id: Option<&str>) -> bool { check_access_for_share() }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl UsesRLS for GlobalData {
	fn can_access_cached(&self, _user_id: Option<&str>) -> bool { check_access_for_global_data() }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
}
impl UsesRLS for User {
	fn can_access_cached(&self, _user_id: Option<&str>) -> bool { check_access_for_user() }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_admin(actor) || actor.id == self.id))
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> {
        //Ok(can_access(actor, self) && (is_user_admin(actor) || actor.id == self.id))
        Ok(false) // account deletion will be possible eventually, but too many complications for now
    }
}

// likely to be removed at some point
// ----------

impl UsesRLS for Proposal {
	fn can_access_cached(&self, _user_id: Option<&str>) -> bool { check_access_for_feedback_proposal() }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl UsesRLS for crate::db::feedback_user_infos::UserInfo {
	fn can_access_cached(&self, _user_id: Option<&str>) -> bool { check_access_for_feedback_user_info() }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && actor.id == self.id)
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && actor.id == self.id)
    }
}

// simple RLS policies (where to access, it must be that: user is admin, user is creator, or entry's RLS policy allows access)
// ==========

impl UsesRLS for Map {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_map(user_id, &self.creator, &self.accessPolicy) }
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::maps, APAction::modify).await?))
    }
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::maps, APAction::delete).await?))
    }
}
impl UsesRLS for Media {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_media(user_id, &self.creator, &self.accessPolicy) }
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::medias, APAction::modify).await?))
    }
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::medias, APAction::delete).await?))
    }
}
impl UsesRLS for Node {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_node(user_id, &self.creator, &self.accessPolicy) }
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::nodes, APAction::modify).await?))
    }
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::nodes, APAction::delete).await?))
    }
}
impl Node {
    pub async fn can_vote(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::nodes, APAction::vote).await?))
    }
    pub async fn can_add_phrasing(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::nodes, APAction::addPhrasing).await?))
    }
}
impl UsesRLS for Term {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_term(user_id, &self.creator, &self.accessPolicy) }
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::terms, APAction::modify).await?))
    }
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::terms, APAction::delete).await?))
    }
}

// derivative RLS policies (where to access, it must be that: user is admin, user is creator, or all of the associated RLS policies must pass)
// ==========

impl UsesRLS for NodeLink {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_node_link(user_id, &self.creator, &self.c_accessPolicyTargets) }
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        let child = get_node(ctx, &self.child).await?;
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || child.can_modify(ctx, actor).await?))
    }
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        let child = get_node(ctx, &self.child).await?;
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || child.can_delete(ctx, actor).await?))
    }
}
impl UsesRLS for NodePhrasing {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_node_phrasing(user_id, &self.creator, &self.c_accessPolicyTargets) }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl UsesRLS for NodeRating {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_node_rating(user_id, &self.creator, &self.c_accessPolicyTargets) }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_creator(actor, &self.creator)) // only creator can edit/delete their own ratings
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_creator(actor, &self.creator)) // only creator can edit/delete their own ratings
    }
}
impl UsesRLS for NodeRevision {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_node_revision(user_id, &self.creator, &self.c_accessPolicyTargets) }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_creator(actor, &self.creator)) // only creator can edit their own revision (though mods can delete)
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl UsesRLS for NodeTag {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_node_tag(user_id, &self.creator, &self.c_accessPolicyTargets) }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}

// unique RLS policies
// ==========

impl UsesRLS for MapNodeEdit {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_map_node_edit(user_id, /*&self.creator,*/ &self.c_accessPolicyTargets) }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
}
impl UsesRLS for UserHidden {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_user_hidden(user_id, self.id.as_str()) }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && actor.id == self.id) // only user can edit their own hidden-data
    }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> {
        Ok(false) // account deletion will be possible eventually, but too many complications for now
    }
}
impl UsesRLS for CommandRun {
    fn can_access_cached(&self, user_id: Option<&str>) -> bool { check_access_for_command_run(user_id, self.public_base, &self.c_accessPolicyTargets) }
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
}

// local helpers (to match format of rls_policies.rs as much as possible)
// ==========

fn can_access(actor: &User, target: &impl UsesRLS) -> bool {
    target.can_access_cached(Some(actor.id.as_str()))
}

fn is_user_creator(actor: &User, target_creator: &str) -> bool {
    actor.id == target_creator
}
fn is_user_mod_or_creator(actor: &User, target_creator: &str) -> bool {
    if actor.permissionGroups.r#mod { return true; }
    if actor.id == target_creator { return true; }
    return false;
}
fn is_user_admin_or_creator(actor: &User, target_creator: &str) -> bool {
    if actor.permissionGroups.admin { return true; }
    if actor.id == target_creator { return true; }
    return false;
}

async fn do_policies_allow_x(ctx: &AccessorContext<'_>, actor: &User, policy_targets: &Vec<AccessPolicyTarget>, action: APAction) -> Result<bool, Error> {
    // The `c_accessPolicyTargets` fields should always have at least one entry in them; if not, something is wrong, so play it safe and reject access.
	// (Most tables enforce non-emptiness of this field with a row constraint, but nodeTags is an exception; its associated nodes may be deleted, leaving it without any targets.)
	// (This line thus serves to prevent "orphaned node-tags" from being visible by non-admins, as well as a general-purpose "second instance" of the non-emptiness check.)
    if policy_targets.is_empty() {
        return Ok(false);
    }
    
    for target in policy_targets {
        if !does_policy_allow_x(ctx, actor, &target.policy_id, target.ap_table, action).await? {
            return Ok(false);
        }
    }

    Ok(true)
}
async fn does_policy_allow_x(ctx: &AccessorContext<'_>, actor: &User, policy_id: &str, table: APTable, action: APAction) -> Result<bool, Error> {
    let policy = get_access_policy(ctx, policy_id).await?;
    if policy.permissions.for_table(table).as_bool(action)
        && policy.permission_extends_for_user_and_table(Some(actor.id.as_str()), table).map(|a| a.as_bool(action).clone()) != Some(false) {
        return Ok(true);
    }

    if policy.permission_extends_for_user_and_table(Some(actor.id.as_str()), table).map(|a| a.as_bool(action)) == Some(true) {
        return Ok(true);
    }

    Ok(false)
}