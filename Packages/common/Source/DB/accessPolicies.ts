import {Assert} from "web-vcore/nm/js-vextensions";
import {CreateAccessor, GetDoc, GetDocs} from "web-vcore/nm/mobx-graphlink";
import {systemUserID} from "../DB_Constants.js";

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