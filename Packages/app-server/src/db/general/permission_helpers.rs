use std::collections::HashMap;

use rust_shared::{anyhow::{anyhow, bail}, utils::auth::jwt_utils_base::UserJWTData};

use crate::{utils::db::{accessors::AccessorContext, rls::rls_policies::{check_access_for_user, check_access_for_media, check_access_for_node, check_access_for_node_rating, check_access_for_term, check_access_for_map, check_access_for_node_link, check_access_for_node_phrasing, check_access_for_node_revision, check_access_for_node_tag, check_access_for_map_node_edit, check_access_for_user_hidden, check_access_for_command_run, check_access_for_access_policy, check_access_for_global_data, check_access_for_feedback_proposal, check_access_for_feedback_user_info}}, db::{users::{User, get_user}, access_policies::{get_access_policy}, access_policies_::{_permission_set::{APTable, APAction}, _access_policy::AccessPolicy}, _shared::{access_policy_target::AccessPolicyTarget, table_permissions::UsesRLS}, nodes_::_node::Node}, links::db_live_cache::{get_admin_user_ids_cached, get_access_policy_cached}};
use rust_shared::anyhow::Error;

pub fn is_user_mod(user: &User) -> bool { user.permissionGroups.r#mod }
pub fn is_user_admin(user: &User) -> bool { user.permissionGroups.admin }

/// If user is the creator, also requires that they (still) have basic permissions.
pub fn is_user_creator_or_mod(user: &User, target_creator: &str) -> bool {
    if user.id == target_creator && user.permissionGroups.basic { return true; }
    if user.permissionGroups.r#mod { return true; }
    false
}

/*pub fn assert_user_is_mod(user_info: &User) -> Result<(), Error> {
    if actor.permissionGroups.r#mod { return Ok(()); }
    Err(anyhow!("This action requires moderator permissions."))
}*/

pub async fn assert_user_can_modify(ctx: &AccessorContext<'_>, actor: &User, target: &impl UsesRLS) -> Result<(), Error> {
    match target.can_modify(ctx, actor).await? {
        true => Ok(()),
        false => Err(anyhow!("You do not have permission to modify this entry.")),
    }
}
pub async fn assert_user_can_delete(ctx: &AccessorContext<'_>, actor: &User, target: &impl UsesRLS) -> Result<(), Error> {
    match target.can_modify(ctx, actor).await? {
        true => Ok(()),
        false => Err(anyhow!("You do not have permission to delete this entry.")),
    }
}
pub async fn assert_user_can_vote(ctx: &AccessorContext<'_>, actor: &User, target: &Node) -> Result<(), Error> {
    match target.can_vote(ctx, actor).await? {
        true => Ok(()),
        false => Err(anyhow!("You do not have permission to vote on this entry.")),
    }
}
pub async fn assert_user_can_add_phrasing(ctx: &AccessorContext<'_>, actor: &User, target: &Node) -> Result<(), Error> {
    match target.can_add_phrasing(ctx, actor).await? {
        true => Ok(()),
        false => Err(anyhow!("You do not have permission to add a phrasing to this entry.")),
    }
}