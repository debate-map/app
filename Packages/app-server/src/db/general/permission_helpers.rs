use std::collections::HashMap;

use rust_shared::{
	anyhow::{anyhow, bail},
	utils::auth::jwt_utils_base::UserJWTData,
};

use crate::{
	db::{
		_shared::{
			access_policy_target::AccessPolicyTarget,
			table_permissions::{CanAddChild, CanAddPhrasing, CanDelete, CanModify, CanVote},
		},
		access_policies::get_access_policy,
		access_policies_::{
			_access_policy::AccessPolicy,
			_permission_set::{APAction, APTable},
		},
		nodes_::_node::Node,
		users::{get_user, User},
	},
	links::db_live_cache::{get_access_policy_cached, get_admin_user_ids_cached},
	utils::db::accessors::AccessorContext,
};
use rust_shared::anyhow::Error;

pub fn is_user_mod(user: &User) -> bool {
	user.permissionGroups.r#mod
}
pub fn is_user_admin(user: &User) -> bool {
	user.permissionGroups.admin
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

pub async fn assert_user_can_modify(ctx: &AccessorContext<'_>, actor: &User, target: &impl CanModify) -> Result<(), Error> {
	match target.can_modify(ctx, actor).await? {
		true => Ok(()),
		false => Err(anyhow!("You do not have permission to modify this entry.")),
	}
}
pub async fn assert_user_can_delete(ctx: &AccessorContext<'_>, actor: &User, target: &impl CanDelete) -> Result<(), Error> {
	match target.can_delete(ctx, actor).await? {
		true => Ok(()),
		false => Err(anyhow!("You do not have permission to delete this entry.")),
	}
}
pub async fn assert_user_can_add_child(ctx: &AccessorContext<'_>, actor: &User, target: &impl CanAddChild) -> Result<(), Error> {
	match target.can_add_child(ctx, actor).await? {
		true => Ok(()),
		false => Err(anyhow!("You do not have permission to add a child to this entry.")),
	}
}
pub async fn assert_user_can_add_phrasing(ctx: &AccessorContext<'_>, actor: &User, target: &impl CanAddPhrasing) -> Result<(), Error> {
	match target.can_add_phrasing(ctx, actor).await? {
		true => Ok(()),
		false => Err(anyhow!("You do not have permission to add a phrasing to this entry.")),
	}
}
pub async fn assert_user_can_vote(ctx: &AccessorContext<'_>, actor: &User, target: &impl CanVote) -> Result<(), Error> {
	match target.can_vote(ctx, actor).await? {
		true => Ok(()),
		false => Err(anyhow!("You do not have permission to vote on this entry.")),
	}
}
