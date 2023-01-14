import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetAccessPolicy} from "../accessPolicies.js";
import {AccessPolicy} from "../accessPolicies/@AccessPolicy.js";
import {APAction, APTable, PermissionSetForType} from "../accessPolicies/@PermissionSet.js";

// sync:rs
/*export const DoPoliciesAllowX = CreateAccessor((actor_id: string|n, policy_targets: AccessPolicyTarget[], action: APAction) => {
	// todo: port from rust
});*/
// sync:rs
export const DoesPolicyAllowX = CreateAccessor((actor_id: string|n, policy_id: string|n, table: APTable, action: APAction)=>{
	const policy = GetAccessPolicy(policy_id);
	if (policy == null) return false;

	if (PermissionSetForType.AsBool(policy.permissions[table], action)
		&& PermissionSetForType.AsBool(AccessPolicy.PermissionExtendsForUserAndTable(policy, actor_id, table), action) != false) {
		return true;
	}
	if (PermissionSetForType.AsBool(AccessPolicy.PermissionExtendsForUserAndTable(policy, actor_id, table), action) == true) {
		return true;
	}
	return false;
});