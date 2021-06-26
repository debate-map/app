import {IsNaN} from "web-vcore/nm/js-vextensions";
import {GetDoc, GetDocs, StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {NodeChildLink} from "./nodeChildLinks/@NodeChildLink.js";

export const GetNodeChildLink = StoreAccessor(s=>(id: string): NodeChildLink=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.nodeChildLinks.get(id));
});
export const GetNodeChildLinks = StoreAccessor(s=>(parentID?: string, childID?: string): NodeChildLink[]=>{
	return GetDocs({
		params: {filter: {
			or: [
				parentID != null && {parent: {equalTo: parentID}},
				childID != null && {child: {equalTo: childID}},
			].filter(a=>a),
		}},
	}, a=>a.nodeChildLinks);
});