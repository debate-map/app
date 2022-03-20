import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {emptyArray_forLoading, CE} from "web-vcore/nm/js-vextensions.js";
import {MapNodePhrasing} from "./nodePhrasings/@MapNodePhrasing.js";
import {MapNodeTag, TagComp, GetTagCompClassByTag, GetTagCompOfTag} from "./nodeTags/@MapNodeTag.js";
import {GraphDBShape} from "../DBShape.js";

// todo: probably add and use some sort of system where mobx-graphlink auto-reattaches data to their classes, based on AJV metadata
export const GetNodeTags = CreateAccessor((nodeID: string, userIDs?: string[]|n): MapNodeTag[]=>{
	return GetDocs({
		//queryOps: [new WhereOp(`nodes.${nodeID}`, ">", "")], // `if value > ""` means "if key exists"
		//queryOps: [new WhereOp(`nodes`, "array-contains", nodeID)],
		params: {filter: {
			nodes: {contains: nodeID},
			creator: userIDs != null && {in: userIDs},
		}},
	}, a=>a.nodeTags);
});
export const GetNodeTag = CreateAccessor((tagID: string)=>{
	return GetDoc({}, a=>a.nodeTags.get(tagID));
});

export const GetNodeTagComps = CreateAccessor((nodeID: string, unwrapCompositeTags = true, tagsToIgnore?: string[]): TagComp[]=>{
	const tags = GetNodeTags(nodeID);
	if (tags == emptyArray_forLoading) return emptyArray_forLoading;
	return CE(tags).SelectMany(tag=>{
		if (tagsToIgnore?.includes(tag.id)) return [];
		const baseComp = GetTagCompOfTag(tag);
		return unwrapCompositeTags ? GetFinalTagCompsForTag(tag) : [baseComp];
	});
});
export const GetFinalTagCompsForTag = CreateAccessor((tag: MapNodeTag): TagComp[]=>{
	const compClass = GetTagCompClassByTag(tag);
	const comp = GetTagCompOfTag(tag);
	//return comp.As(compClass).GetFinalTagComps();
	//comp.As(compClass);
	Object.setPrototypeOf(comp, compClass.prototype);
	//return compClass.prototype.GetFinalTagComps.call(comp);
	return comp.GetFinalTagComps();
});

export const GetNodeLabelCounts = CreateAccessor((tagsList: MapNodeTag[])=>{
	const labelCounts = new Map<string, number>();
	for (const tag of tagsList) {
		const labelsInTag = tag.labels?.labels ?? [];
		for (const label of labelsInTag) {
			labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
		}
	}
	return labelCounts;
});