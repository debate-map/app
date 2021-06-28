import {IsNaN} from "web-vcore/nm/js-vextensions";
import {StoreAccessor, GetDoc} from "web-vcore/node_modules/mobx-graphlink";
import {AccessPolicy} from "./accessPolicies/@AccessPolicy";
import {NodeChildLink} from "./nodeChildLinks/@NodeChildLink";
import {VisibilityDirective} from "./visibilityDirectives/@VisibilityDirective";

export const GetVisibilityDirective = StoreAccessor(s=>(id: string): VisibilityDirective=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.visibilityDirectives.get(id));
});