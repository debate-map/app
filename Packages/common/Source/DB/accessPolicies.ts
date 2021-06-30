import {IsNaN} from "web-vcore/nm/js-vextensions.js";
import {StoreAccessor, GetDoc} from "web-vcore/nm/mobx-graphlink";
import {AccessPolicy} from "./accessPolicies/@AccessPolicy.js";
import {NodeChildLink} from "./nodeChildLinks/@NodeChildLink.js";

export const GetAccessPolicy = StoreAccessor(s=>(id: string)=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.accessPolicies.get(id));
});

export function GetDefaultAccessPolicyID_ForMap() {
	return null as any as string;
}
export function GetDefaultAccessPolicyID_ForNode() {
	return null as any as string;
}
export function GetDefaultAccessPolicyID_ForNodeRating() {
	return null as any as string;
}