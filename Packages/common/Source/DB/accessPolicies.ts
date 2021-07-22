import {CreateAccessor, GetDoc, GetDocs} from "web-vcore/nm/mobx-graphlink";
import {systemUserID} from "../DB_Constants.js";

export const GetAccessPolicies = CreateAccessor(c=>(creatorID?: string)=>{
	return GetDocs({
		//queryOps: [new WhereOp("name", "==", name)],
		params: {filter: {creator: {equalTo: systemUserID}}},
	}, a=>a.accessPolicies);
});
export const GetAccessPolicy = CreateAccessor(c=>(id: string|n)=>{
	return GetDoc({}, a=>a.accessPolicies.get(id!));
});

// todo: make so the below remember user preferences better (eg. defaulting to user's last-selected access-policy)
export function GetDefaultAccessPolicyID_ForMap() {
	const accessPolicies_system = GetAccessPolicies(systemUserID);
	return accessPolicies_system.find(a=>a.name == "Public, ungoverned (standard)")!.id;
}
export function GetDefaultAccessPolicyID_ForNode() {
	const accessPolicies_system = GetAccessPolicies(systemUserID);
	return accessPolicies_system.find(a=>a.name == "Public, ungoverned (standard)")!.id;
}
export function GetDefaultAccessPolicyID_ForNodeRating() {
	const accessPolicies_system = GetAccessPolicies(systemUserID);
	return accessPolicies_system.find(a=>a.name == "Public, ungoverned (standard)")!.id;
}