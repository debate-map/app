use std::collections::HashMap;

use crate::{utils::auth::jwt_utils_base::UserJWTData, User};
use anyhow::{anyhow, bail};

pub fn access_fail_msg() -> &'static str {
	"The specified entry either does not exist, or you do not have permission to access it."
}
pub fn modify_fail_msg() -> &'static str {
	"You do not have permission to modify this entry."
}
pub fn delete_fail_msg() -> &'static str {
	"You do not have permission to delete this entry."
}

pub fn is_user_mod(user: &User) -> bool {
	user.permissionGroups.r#mod
}
pub fn is_user_admin(user: &User) -> bool {
	user.permissionGroups.admin
}

pub fn is_user_creator(user_id: Option<&str>, creator_id: &str) -> bool {
	match user_id {
		Some(user_id) => user_id == creator_id,
		None => false,
	}
}

/// If user is the creator, also requires that they (still) have basic permissions.
pub fn is_user_creator_or_mod(user: &User, target_creator: &str) -> bool {
	if user.id == target_creator && user.permissionGroups.basic {
		return true;
	}
	if user.permissionGroups.r#mod {
		return true;
	}
	false
}

/*pub fn assert_user_is_mod(user_info: &User) -> Result<(), Error> {
	if actor.permissionGroups.r#mod { return Ok(()); }
	Err(anyhow!("This action requires moderator permissions."))
}*/
