/*import {IsNaN} from "js-vextensions";
import {CreateAccessor, GetDoc} from "mobx-graphlink";
import {AccessPolicy} from "./accessPolicies/@AccessPolicy.js";
import {NodeLink} from "./nodeLinks/@NodeLink.js";
import {VisibilityDirective} from "./visibilityDirectives/@VisibilityDirective.js";

export const GetVisibilityDirective = CreateAccessor((id: string): VisibilityDirective|n=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.visibilityDirectives.get(id));
});*/