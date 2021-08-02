import {Assert} from "web-vcore/nm/js-vextensions";
import {CreateAccessor, GetDoc, GetDocs} from "web-vcore/nm/mobx-graphlink";
import {systemUserID} from "../DB_Constants.js";
import {PermissionSet, PermissionSetForType, PermitCriteria} from "./accessPolicies/@AccessPolicy.js";
import {GetUserReputation_ApprovalPercent, GetUserReputation_Approvals} from "./users.js";

export const GetAccessPolicies = CreateAccessor((creatorID?: string)=>{
	return GetDocs({
		//queryOps: [new WhereOp("name", "==", name)],
		params: {filter: {creator: {equalTo: creatorID}}},
	}, a=>a.accessPolicies);
});
export const GetAccessPolicy = CreateAccessor((id: string|n)=>{
	return GetDoc({}, a=>a.accessPolicies.get(id!));
});
/*export const GetAccessPolicyByNameAndCreator = CreateAccessor((name: string, creator: string)=>{
	return GetDocs({
		//queryOps: [new WhereOp(`titles.${titleKey}`, "==", title)],
		params: {filter: {
			name: {equalTo: name},
			creator: {equalTo: creator},
		}},
	}, a=>a.accessPolicies);
});*/
export const GetSystemAccessPolicyID = CreateAccessor((name: string)=>{
	const accessPolicies_system = GetAccessPolicies(systemUserID);
	const result = accessPolicies_system.find(a=>a.name == name);
	Assert(result != null, `Could not find system access-policy with name:${name}`);
	return result.id;
});

// todo: make so the below remember user preferences better (eg. defaulting to user's last-selected access-policy)
export const GetDefaultAccessPolicyID_ForMap = CreateAccessor(()=>{
	return GetSystemAccessPolicyID("Public, ungoverned (standard)");
});
export const GetDefaultAccessPolicyID_ForNode = CreateAccessor(()=>{
	return GetSystemAccessPolicyID("Public, ungoverned (standard)");
});
export const GetDefaultAccessPolicyID_ForNodeRating = CreateAccessor(()=>{
	return GetSystemAccessPolicyID("Public, ungoverned (standard)");
});
export const GetDefaultAccessPolicyID_ForMedia = CreateAccessor(()=>{
	return GetSystemAccessPolicyID("Public, ungoverned (standard)");
});

export function UserFulfillsPermitCriteria(userID: string|n, criteria: PermitCriteria) {
	const approvals = GetUserReputation_Approvals(userID);
	if (criteria.minApprovals == -1 || approvals < criteria.minApprovals) return false;
	const approvalPercent = GetUserReputation_ApprovalPercent(userID);
	if (criteria.minApprovalPercent == -1 || approvalPercent < criteria.minApprovalPercent) return false;
	return true;
}

// used for, eg. whether to show the voting panel for a node (if no one is permitted, there's no point in even showing it)
/*export function PermissionSetPermitsNoOne(permissionSet: PermissionSet, collection: keyof PermissionSet, permission: keyof PermissionSetForType) {
	const permitCriteriaOrBoolean = permissionSet[collection][permission];
	if (typeof permitCriteriaOrBoolean == "boolean") return permitCriteriaOrBoolean == false;
	Assert(permitCriteriaOrBoolean != null, "Access-policy inheritance not yet implemented.");
	return PermitCriteriaPermitsNoOne(permitCriteriaOrBoolean);
}*/
export function PermitCriteriaPermitsNoOne(criteria: PermitCriteria) {
	return criteria.minApprovals == -1 || criteria.minApprovalPercent == -1;
}