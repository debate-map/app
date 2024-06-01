use std::collections::{HashMap, HashSet};

use rust_shared::{
	anyhow::Error,
	utils::{auth::jwt_utils_base::UserJWTData, general_::extensions::ToOwnedV},
};
use tracing::{info, warn};

use crate::{
	db::{
		_shared::access_policy_target::AccessPolicyTarget,
		access_policies::get_access_policy,
		access_policies_::{_access_policy::AccessPolicy, _permission_set::APTable},
	},
	links::db_live_cache::{get_access_policy_cached, get_admin_user_ids_cached},
	utils::db::accessors::AccessorContext,
};

// sync:sql[RLSHelpers.sql]

pub(super) fn is_user_admin_or_creator(user_id: Option<&str>, creator_id: &str) -> bool {
	is_user_admin(user_id) || is_user_creator(user_id, creator_id)
}

pub(super) fn is_user_creator(user_id: Option<&str>, creator_id: &str) -> bool {
	if let Some(user_id) = user_id
		&& user_id == creator_id
	{
		true
	} else {
		false
	}
}

pub(super) fn is_user_admin(user_id: Option<&str>) -> bool {
	try_is_user_admin(user_id).unwrap_or_else(|err| {
		warn!("Got error in try_is_user_admin (should only happen rarely): {:?}", err);
		false
	})
}
pub(super) fn try_is_user_admin(user_id: Option<&str>) -> Result<bool, Error> {
	match user_id {
		Some(user_id) => {
			let admin_user_ids: HashSet<String> = get_admin_user_ids_cached()?;
			//info!("admin_user_ids: {:?} @me_id:{}", admin_user_ids, user_id);
			Ok(admin_user_ids.contains(user_id))
		},
		None => Ok(false),
	}
}

// policy checks (wrappers around functions in _permission_set.rs, since it retrieves the policies from the special cache)
// ==========

pub(super) fn does_policy_allow_access(user_id: Option<&str>, policy_id: &str, table: APTable) -> bool {
	try_does_policy_allow_access(user_id, policy_id, table).unwrap_or_else(|err| {
		warn!("Got error in try_does_policy_allow_access (should only happen rarely): {:?}", err);
		false
	})
}
pub(super) fn try_does_policy_allow_access(user_id: Option<&str>, policy_id: &str, table: APTable) -> Result<bool, Error> {
	let policy: AccessPolicy = get_access_policy_cached(policy_id)?;
	if policy.permissions.for_table(table).access && policy.permission_extends_for_user_and_table(user_id, table).map(|a| a.access.clone()) != Some(false) {
		return Ok(true);
	}

	if policy.permission_extends_for_user_and_table(user_id, table).map(|a| a.access) == Some(true) {
		return Ok(true);
	}

	Ok(false)
}
//pub(super) fn try_does_policy_allow_access_base(user_id: Option<&str>, policy: &AccessPolicy, table: APTable) -> Result<bool, Error> { ... }

pub(super) fn do_policies_allow_access(user_id: Option<&str>, policy_targets: &Vec<AccessPolicyTarget>) -> bool {
	try_do_policies_allow_access(user_id, policy_targets).unwrap_or_else(|err| {
		warn!("Got error in try_do_policies_allow_access (should only happen rarely): {:?}", err);
		false
	})
}
pub(super) fn try_do_policies_allow_access(user_id: Option<&str>, policy_targets: &Vec<AccessPolicyTarget>) -> Result<bool, Error> {
	// The `c_accessPolicyTargets` fields should always[*] have at least one entry in them; if not, something is wrong, so play it safe and reject access.
	// (Most tables enforce non-emptiness of this field with a row constraint, [*]but nodeTags is an exception; its associated nodes may be deleted, leaving it without any targets.)
	// (This line thus serves to prevent "orphaned node-tags" from being visible by non-admins, as well as a general-purpose "second instance" of the non-emptiness check.)
	if policy_targets.is_empty() {
		return Ok(false);
	}

	for target in policy_targets {
		if !does_policy_allow_access(user_id, &target.policy_id, target.ap_table) {
			return Ok(false);
		}
	}

	Ok(true)
}
/*pub(super) async fn try_do_policies_allow_access_ctx(ctx: &AccessorContext<'_>, user_id: Option<&str>, policy_targets: &Vec<AccessPolicyTarget>) -> Result<bool, Error> {
	// The `c_accessPolicyTargets` fields should always have at least one entry in them; if not, something is wrong, so play it safe and reject access.
	// (Most tables enforce non-emptiness of this field with a row constraint, but nodeTags is an exception; its associated nodes may be deleted, leaving it without any targets.)
	// (This line thus serves to prevent "orphaned node-tags" from being visible by non-admins, as well as a general-purpose "second instance" of the non-emptiness check.)
	if policy_targets.is_empty() {
		return Ok(false);
	}

	for target in policy_targets {
		let policy = get_access_policy(ctx, &target.policy_id).await?;
		if !try_does_policy_allow_access_base(user_id, &policy, target.policy_subfield)? {
			return Ok(false);
		}
	}

	Ok(true)
}*/
