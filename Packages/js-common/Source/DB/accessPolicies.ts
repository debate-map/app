import {Assert} from "web-vcore/nm/js-vextensions";
import {CreateAccessor, GetDoc, GetDocs} from "web-vcore/nm/mobx-graphlink";
import {systemUserID} from "../DB_Constants.js";
import {PermitCriteria} from "./accessPolicies/@PermissionSet.js";
import {GetUserReputation_ApprovalPercent, GetUserReputation_Approvals, MeID} from "./users.js";
import {GetUserHidden} from "./userHiddens.js";
import {DBCollection} from "../DBShape.js";

export const GetAccessPolicies = CreateAccessor((creatorID?: string)=>{
	return GetDocs({
		//queryOps: [new WhereOp("name", "==", name)],
		params: {filter: {
			creator: creatorID && {equalTo: creatorID},
		}},
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

export const accessPolicyFallbackInfo = `
The final access-policy for a new entry is based on the first provided value (ie. not set to null/empty) in this list:
1) If the user-interface shows a way to choose the access-policy for a given entry: the chosen policy.
2) If creating a new node within a map with a "Node access policy" default set: that default. (it determines what policy the dialog starts having chosen)
3) If there exists a "Default access policy" for the given type of entry-creation (as set with the controls just above): that default.
4) If the user's profile has this "Generic fallback" policy set: that fallback policy.
5) If all of the above are empty/invalid: the built-in "Public, ungoverned (standard)" policy. (may change in the future, eg. depending on entry type)
`.AsMultiline(0);
export const GetFinalAccessPolicyForNewEntry = CreateAccessor((directChoiceInUI: string|n, contextualDefault: string|n, entryType: DBCollection)=>{
	const userHidden = GetUserHidden(MeID());
	const result = (
		GetAccessPolicy(directChoiceInUI) ??
		GetAccessPolicy(contextualDefault) ??
		(
			entryType == "nodeRatings" ? GetAccessPolicy(userHidden?.extras.defaultAccessPolicy_nodeRatings) :
			null
		) ??
		GetAccessPolicy(GetUserHidden(MeID())?.lastAccessPolicy) ??
		GetAccessPolicy(GetSystemAccessPolicyID("Public, ungoverned (standard)"))
	);
	Assert(result != null, `Could not find an access-policy with which to create a new entry in collection "${entryType}"!`);
	return result;
});

export function UserFulfillsPermitCriteria(userID: string|n, criteria: PermitCriteria|n) {
	if (criteria == null) return false;
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
export function PermitCriteriaPermitsNoOne(criteria: PermitCriteria|n) {
	return criteria == null || criteria.minApprovals == -1 || criteria.minApprovalPercent == -1;
}