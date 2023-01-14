use rust_shared::{utils::{auth::jwt_utils_base::UserJWTData, general_::extensions::ToOwnedV}, anyhow::{bail, anyhow}, anyhow::Error};
use tracing::info;

use crate::{db::{terms::Term, access_policies::{get_access_policy}, map_node_edits::MapNodeEdit, user_hiddens::UserHidden, command_runs::CommandRun, node_tags::NodeTag, node_revisions::NodeRevision, node_ratings::NodeRating, node_phrasings::NodePhrasing, node_links::NodeLink, nodes_::_node::Node, maps::Map, medias::Media, feedback_proposals::Proposal, shares::Share, global_data::GlobalData, users::User, access_policies_::{_permission_set::{APAction, APTable}, _access_policy::AccessPolicy}, _shared::access_policy_target::AccessPolicyTarget, nodes::get_node, general::permission_helpers::is_user_admin}, links::db_live_cache::get_access_policy_cached, utils::db::{accessors::AccessorContext, rls::rls_policies::UsesRLS}};

//async fn can_access(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;
pub trait CanModify {
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;
}
pub trait CanDelete {
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;
}
pub trait CanVote {
    async fn can_vote(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;
}
pub trait CanAddPhrasing {
    async fn can_add_phrasing(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error>;
}

// empty policies (ie. can always be viewed by anyone) [these functions are not needed in sql version]
// ==========

impl CanModify for AccessPolicy {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl CanDelete for AccessPolicy {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}

impl CanModify for Share {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl CanDelete for Share {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}

impl CanModify for GlobalData {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
}
impl CanDelete for GlobalData {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
}

impl CanModify for User {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_admin(actor) || actor.id == self.id))
    }
}
impl CanDelete for User {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> {
        //Ok(can_access(actor, self) && (is_user_admin(actor) || actor.id == self.id))
        Ok(false) // account deletion will be possible eventually, but too many complications for now
    }
}

// likely to be removed at some point
// ----------

impl CanModify for Proposal {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl CanDelete for Proposal {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}

impl CanModify for crate::db::feedback_user_infos::UserInfo {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && actor.id == self.id)
    }
}
impl CanDelete for crate::db::feedback_user_infos::UserInfo {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && actor.id == self.id)
    }
}

// simple RLS policies (where to access, it must be that: user is admin, user is creator, or entry's RLS policy allows access)
// ==========

impl CanModify for Map {
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::maps, APAction::modify).await?))
    }
}
impl CanDelete for Map {
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::maps, APAction::delete).await?))
    }
}

impl CanModify for Media {
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::medias, APAction::modify).await?))
    }
}
impl CanDelete for Media {
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::medias, APAction::delete).await?))
    }
}

impl CanModify for Node {
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::nodes, APAction::modify).await?))
    }
}
impl CanDelete for Node {
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::nodes, APAction::delete).await?))
    }
}
impl CanVote for Node {
    async fn can_vote(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::nodes, APAction::vote).await?))
    }
}
impl CanAddPhrasing for Node {
    async fn can_add_phrasing(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::nodes, APAction::addPhrasing).await?))
    }
}

impl CanModify for Term {
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::terms, APAction::modify).await?))
    }
}
impl CanDelete for Term {
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || does_policy_allow_x(ctx, actor, &self.accessPolicy, APTable::terms, APAction::delete).await?))
    }
}

// derivative RLS policies (where to access, it must be that: user is admin, user is creator, or all of the associated RLS policies must pass)
// ==========

impl CanModify for NodeLink {
    async fn can_modify(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        let child = get_node(ctx, &self.child).await?;
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || child.can_modify(ctx, actor).await?))
    }
}
impl CanDelete for NodeLink {
    async fn can_delete(&self, ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        let child = get_node(ctx, &self.child).await?;
        Ok(can_access(actor, self) && (is_user_mod_or_creator(actor, &self.creator) || child.can_delete(ctx, actor).await?))
    }
}

impl CanModify for NodePhrasing {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl CanDelete for NodePhrasing {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}

impl CanModify for NodeRating {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_creator(actor, &self.creator)) // only creator can edit/delete their own ratings
    }
}
impl CanDelete for NodeRating {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_creator(actor, &self.creator)) // only creator can edit/delete their own ratings
    }
}

impl CanModify for NodeRevision {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_creator(actor, &self.creator)) // only creator can edit their own revision (though mods can delete)
    }
}
impl CanDelete for NodeRevision {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}

impl CanModify for NodeTag {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}
impl CanDelete for NodeTag {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && is_user_mod_or_creator(actor, &self.creator))
    }
}

// unique RLS policies
// ==========

/*impl CanModify for MapNodeEdit {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
}
impl CanDelete for MapNodeEdit {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
}*/

impl CanModify for UserHidden {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, actor: &User) -> Result<bool, Error> {
        Ok(can_access(actor, self) && actor.id == self.id) // only user can edit their own hidden-data
    }
}
/*impl CanDelete for UserHidden {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> {
        Ok(false) // account deletion will be possible eventually, but too many complications for now
    }
}*/

/*impl CanModify for CommandRun {
    async fn can_modify(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
}
impl CanDelete for CommandRun {
    async fn can_delete(&self, _ctx: &AccessorContext<'_>, _actor: &User) -> Result<bool, Error> { Ok(false) }
}*/

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