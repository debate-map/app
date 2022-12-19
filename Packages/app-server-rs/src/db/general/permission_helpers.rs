use rust_shared::anyhow::{anyhow, bail};

use crate::{utils::db::accessors::AccessorContext, db::{users::User, access_policies::{AccessPolicy, get_access_policy}}};
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

pub async fn assert_user_can_update(_ctx: &AccessorContext<'_>, user: &User, target_creator: &str, _access_policy_id: &str) -> Result<(), Error> {
    //let policy = get_access_policy(ctx, access_policy_id).await?;
    Ok(assert_user_can_update_simple(user, target_creator)?)
}
pub fn assert_user_can_update_simple(user: &User, target_creator: &str) -> Result<(), Error> {
    if user.id == target_creator && user.permissionGroups.basic { return Ok(()); }
    if user.permissionGroups.r#mod { return Ok(()); }
    bail!("You do not have permission to update this entry.")
}

pub async fn assert_user_can_delete(_ctx: &AccessorContext<'_>, user: &User, target_creator: &str, _access_policy_id: &str) -> Result<(), Error> {
    //let policy = get_access_policy(ctx, access_policy_id).await?;
    Ok(assert_user_can_delete_simple(user, target_creator)?)
}
pub fn assert_user_can_delete_simple(user: &User, target_creator: &str) -> Result<(), Error> {
    if user.id == target_creator && user.permissionGroups.basic { return Ok(()); }
    if user.permissionGroups.r#mod { return Ok(()); }
    bail!("You do not have permission to delete this entry.")
}

// todo: finish implementing these (and related functions) during completion of permission-system implementation
/*pub fn assert_user_can_delete_sync(actor: &User, creator: &str, _access_policy: &AccessPolicy) -> Result<(), Error> {
    if actor.id == creator && actor.permissionGroups.basic { return Ok(()); }
    if actor.permissionGroups.r#mod { return Ok(()); }
    Err(anyhow!("You do not have permission to delete this entry."))
}
pub fn assert_user_can_access(ctx: &AccessorContext<'_>, actor: &User, creator: &str, access_policy: &AccessPolicy) -> Result<(), Error> {
    if actor.id == creator && actor.permissionGroups.basic { return Ok(()); }
    if access_policy.permissions. { return Ok(()); }
    Err(anyhow!("You do not have permission to access this entry."))
}*/