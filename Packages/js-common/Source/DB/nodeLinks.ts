import {Assert, IsNaN} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {DMCommon_InServer} from "../Utils/General/General.js";
import {OrderKey} from "../Utils/General/OrderKey.js";
import {NodeLink} from "./nodeLinks/@NodeLink.js";
import {ChildGroup} from "./nodes/@NodeType.js";

export const GetNodeLink = CreateAccessor((id: string)=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.nodeLinks.get(id));
});
export const GetNodeLinks = CreateAccessor((parentID?: string|n, childID?: string|n, group?: ChildGroup|n, orderByOrderKeys = true): NodeLink[]=>{
	Assert(parentID != null || childID != null, "Must provide at least one of parentID or childID.");

	// temp; optimization that improves loading speed a bit (~10s to ~7s) [is this still true?]
	if (parentID != null && !DMCommon_InServer()) { // had to disable this in app-server-js, since causing UnlinkNode to fail in some cases (not sure why)
		const linksUnderParent = GetDocs({
			params: {filter: {
				parent: parentID && {equalTo: parentID},
			}},
		}, a=>a.nodeLinks);
		let result = linksUnderParent;
		if (childID != null) result = result.filter(a=>a.child == childID);
		if (group != null) result = result.filter(a=>a.group == group);

		if (orderByOrderKeys) result = result.OrderBy(a=>a.orderKey);
		return result;
	}

	let result = GetDocs({
		params: {filter: {
			/*and: [
				parentID != null && {parent: {equalTo: parentID}},
				childID != null && {child: {equalTo: childID}},
			].filter(a=>a),*/
			parent: parentID && {equalTo: parentID},
			child: childID && {equalTo: childID},
			group: group && {equalTo: group},
		}},
	}, a=>a.nodeLinks);

	if (orderByOrderKeys) result = result.OrderBy(a=>a.orderKey);
	return result;
});

export const GetHighestLexoRankUnderParent = CreateAccessor((parentID: string)=>{
	const parent_childLinks = GetNodeLinks(parentID);
	const parent_lastOrderKey = parent_childLinks.OrderBy(a=>a.orderKey).LastOrX()?.orderKey ?? OrderKey.mid().key;
	return new OrderKey(parent_lastOrderKey);
});