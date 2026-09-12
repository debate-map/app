use anyhow::Error;

use crate::{get_access_policy, AccessPolicyTarget, AccessorContext};

// sync:js
pub async fn do_policies_allow_x(ctx: &AccessorContext<'_>, actor_id: Option<&str>, policy_targets: &Vec<AccessPolicyTarget>, action: &str) -> Result<bool, Error> {
	// The `c_accessPolicyTargets` fields should always have at least one entry in them; if not, something is wrong, so play it safe and reject access.
	// (Most tables enforce non-emptiness of this field with a row constraint, but nodeTags is an exception; its associated nodes may be deleted, leaving it without any targets.)
	// (This line thus serves to prevent "orphaned node-tags" from being visible by non-admins, as well as a general-purpose "second instance" of the non-emptiness check.)
	if policy_targets.is_empty() {
		return Ok(false);
	}

	for target in policy_targets {
		if !does_policy_allow_x(ctx, actor_id, &target.policy_id, &target.ap_table, action).await? {
			return Ok(false);
		}
	}

	Ok(true)
}
// sync:js
pub async fn does_policy_allow_x(ctx: &AccessorContext<'_>, actor_id: Option<&str>, policy_id: &str, table: &str, action: &str) -> Result<bool, Error> {
	let policy = get_access_policy(ctx, policy_id).await?;
	let user_access_override = policy.permission_extends_for_user_and_table(actor_id, table).and_then(|a| a.perm(action.into()));

	// check for access granted to all users (and no user-specific deny)
	if policy.permissions.for_table_perm(table, action.into()) == Some(true) && user_access_override != Some(false) {
		return Ok(true);
	}
	// check for access granted to this specific user
	if user_access_override == Some(true) {
		return Ok(true);
	}

	Ok(false)
}
