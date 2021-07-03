import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {emptyArray_forLoading, CE} from "web-vcore/nm/js-vextensions.js";
import {MapNodePhrasing} from "./nodePhrasings/@MapNodePhrasing.js";
import {MapNodeTag, TagComp, GetTagCompClassByTag, GetTagCompOfTag} from "./nodeTags/@MapNodeTag.js";

const any = null as any;

// todo: add and use some sort of system where mobx-graphlink auto-reattaches data to their classes, based on AJV metadata
export const GetNodeTags = CreateAccessor(c=>(nodeID: string): MapNodeTag[]=>{
	return GetDocs({
		//queryOps: [new WhereOp(`nodes.${nodeID}`, ">", "")], // `if value > ""` means "if key exists"
		//queryOps: [new WhereOp(`nodes`, "array-contains", nodeID)],
		params: {filter: {
			nodes: {contains: nodeID},
		}}
	}, a=>a.nodeTags);
});
export const GetNodeTag = CreateAccessor(c=>(tagID: string)=>{
	return GetDoc({}, a=>a.nodeTags.get(tagID));
});

export const GetNodeTagComps = CreateAccessor(c=>(nodeID: string, unwrapCompositeTags = true, tagsToIgnore?: string[]): TagComp[]=>{
	const tags = GetNodeTags(nodeID);
	if (tags == emptyArray_forLoading) return emptyArray_forLoading;
	return CE(tags).SelectMany(tag=>{
		if (tagsToIgnore?.includes(tag.id)) return [];
		const baseComp = GetTagCompOfTag(tag);
		return unwrapCompositeTags ? GetFinalTagCompsForTag(tag) : [baseComp];
	});
});
export const GetFinalTagCompsForTag = CreateAccessor(c=>(tag: MapNodeTag): TagComp[]=>{
	const compClass = GetTagCompClassByTag(tag);
	const comp = GetTagCompOfTag(tag);
	//return comp.As(compClass).GetFinalTagComps();
	return compClass.prototype.GetFinalTagComps.call(comp);
});