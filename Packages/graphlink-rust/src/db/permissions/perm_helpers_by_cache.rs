use std::collections::{HashMap, HashSet};
use serde::Deserialize;

use crate::{is_user_creator, AccessPolicy};
use crate::tracing::{info, warn};
use crate::{
	anyhow::Error,
	utils::{auth::jwt_utils_base::UserJWTData, general::extensions::ToOwnedV},
};
use crate::AccessPolicyTarget;
use crate::{
	db::{
	},
	links::pgstream::db_live_cache::{get_access_policy_cached, get_admin_user_ids_cached},
	AccessorContext,
};

// sync:sql[RLSHelpers.sql]

pub fn is_user_admin_or_creator_cached(user_id: Option<&str>, creator_id: &str) -> bool {
	is_user_admin_cached(user_id) || is_user_creator(user_id, creator_id)
}

pub fn is_user_admin_cached(user_id: Option<&str>) -> bool {
	try_is_user_admin_cached(user_id).unwrap_or_else(|err| {
		warn!("Got error in try_is_user_admin (should only happen rarely): {:?}", err);
		false
	})
}
pub fn try_is_user_admin_cached(user_id: Option<&str>) -> Result<bool, Error> {
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

pub fn do_policies_allow_access_cached(user_id: Option<&str>, policy_targets: &Vec<AccessPolicyTarget>) -> bool {
	try_do_policies_allow_access_cached(user_id, policy_targets).unwrap_or_else(|err| {
		warn!("Got error in try_do_policies_allow_access (should only happen rarely): {:?}", err);
		false
	})
}
pub fn try_do_policies_allow_access_cached(user_id: Option<&str>, policy_targets: &Vec<AccessPolicyTarget>) -> Result<bool, Error> {
	// The `c_accessPolicyTargets` fields should always[*] have at least one entry in them; if not, something is wrong, so play it safe and reject access.
	// (Most tables enforce non-emptiness of this field with a row constraint, [*]but nodeTags is an exception; its associated nodes may be deleted, leaving it without any targets.)
	// (This line thus serves to prevent "orphaned node-tags" from being visible by non-admins, as well as a general-purpose "second instance" of the non-emptiness check.)
	if policy_targets.is_empty() {
		return Ok(false);
	}

	for target in policy_targets {
		if !does_policy_allow_access_cached(user_id, &target.policy_id, &target.ap_table) {
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

pub fn does_policy_allow_access_cached(user_id: Option<&str>, policy_id: &str, table: &str) -> bool {
	try_does_policy_allow_access_cached(user_id, policy_id, table).unwrap_or_else(|err| {
		warn!("Got error in try_does_policy_allow_access (should only happen rarely): {:?}", err);
		false
	})
}
pub fn try_does_policy_allow_access_cached(user_id: Option<&str>, policy_id: &str, table: &str) -> Result<bool, Error> {
	let policy: AccessPolicy = get_access_policy_cached(policy_id)?;
	let user_access_override = policy.permission_extends_for_user_and_table(user_id, table).and_then(|a| a.access());

	// check for access granted to all users (and no user-specific deny)
	if policy.permissions.for_table_access(table).unwrap_or(false) && user_access_override != Some(false) {
		return Ok(true);
	}
	// check for access granted to this specific user
	if user_access_override == Some(true) {
		return Ok(true);
	}

	Ok(false)
}
//pub(super) fn try_does_policy_allow_access_base(user_id: Option<&str>, policy: &AccessPolicy, table: String) -> Result<bool, Error> { ... }