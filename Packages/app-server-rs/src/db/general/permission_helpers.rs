use rust_shared::anyhow::anyhow;

use crate::{utils::db::accessors::AccessorContext, db::{users::User, access_policies::{AccessPolicy, get_access_policy}}};
use rust_shared::anyhow::Error;

pub async fn assert_user_can_update(_ctx: &AccessorContext<'_>, user_info: &User, creator: &str, _access_policy_id: &str) -> Result<(), Error> {
    //let policy = get_access_policy(ctx, access_policy_id).await?;
    Ok(assert_user_can_update_simple(user_info, creator)?)
}
pub fn assert_user_can_update_simple(user_info: &User, creator: &str) -> Result<(), Error> {
    if user_info.id == creator && user_info.permissionGroups.basic { return Ok(()); }
    if user_info.permissionGroups.r#mod { return Ok(()); }
    Err(anyhow!("You do not have permission to update this entry."))
}

pub async fn assert_user_can_delete(_ctx: &AccessorContext<'_>, user_info: &User, creator: &str, _access_policy_id: &str) -> Result<(), Error> {
    //let policy = get_access_policy(ctx, access_policy_id).await?;
    Ok(assert_user_can_delete_simple(user_info, creator)?)
}
pub fn assert_user_can_delete_simple(user_info: &User, creator: &str) -> Result<(), Error> {
    if user_info.id == creator && user_info.permissionGroups.basic { return Ok(()); }
    if user_info.permissionGroups.r#mod { return Ok(()); }
    Err(anyhow!("You do not have permission to delete this entry."))
}

// todo: finish implementing these (and related functions) during completion of permission-system implementation
/*pub fn assert_user_can_delete_sync(user_info: &User, creator: &str, _access_policy: &AccessPolicy) -> Result<(), Error> {
    if user_info.id == creator && user_info.permissionGroups.basic { return Ok(()); }
    if user_info.permissionGroups.r#mod { return Ok(()); }
    Err(anyhow!("You do not have permission to delete this entry."))
}
pub fn assert_user_can_access(ctx: &AccessorContext<'_>, user_info: &User, creator: &str, access_policy: &AccessPolicy) -> Result<(), Error> {
    if user_info.id == creator && user_info.permissionGroups.basic { return Ok(()); }
    if access_policy.permissions. { return Ok(()); }
    Err(anyhow!("You do not have permission to access this entry."))
}*/