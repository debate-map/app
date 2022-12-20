/*import {IsNaN} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor, GetDoc} from "web-vcore/nm/mobx-graphlink";
import {AccessPolicy} from "./accessPolicies/@AccessPolicy.js";
import {NodeLink} from "./nodeLinks/@NodeLink.js";
import {VisibilityDirective} from "./visibilityDirectives/@VisibilityDirective.js";

export const GetVisibilityDirective = CreateAccessor((id: string): VisibilityDirective|n=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.visibilityDirectives.get(id));
});*/