import {IsNaN} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {NodeChildLink} from "./nodeChildLinks/@NodeChildLink.js";
import {ChildGroup} from "./nodes/@MapNodeType.js";

export const GetNodeChildLink = CreateAccessor((id: string)=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.nodeChildLinks.get(id));
});
export const GetNodeChildLinks = CreateAccessor((parentID?: string|n, childID?: string|n, group?: ChildGroup|n): NodeChildLink[]=>{
	return GetDocs({
		params: {filter: {
			/*and: [
				parentID != null && {parent: {equalTo: parentID}},
				childID != null && {child: {equalTo: childID}},
			].filter(a=>a),*/
			parent: parentID && {equalTo: parentID},
			child: childID && {equalTo: childID},
			group: group && {equalTo: group},
		}},
	}, a=>a.nodeChildLinks);
});