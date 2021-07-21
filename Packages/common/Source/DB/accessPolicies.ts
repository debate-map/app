import {IsNaN} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor, GetDoc, GetDocs} from "web-vcore/nm/mobx-graphlink";
import {AccessPolicy} from "./accessPolicies/@AccessPolicy.js";
import {NodeChildLink} from "./nodeChildLinks/@NodeChildLink.js";

export const GetAccessPolicies = CreateAccessor(c=>()=>{
	return GetDocs({}, a=>a.accessPolicies);
});
export const GetAccessPolicy = CreateAccessor(c=>(id: string|n)=>{
	return GetDoc({}, a=>a.accessPolicies.get(id!));
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