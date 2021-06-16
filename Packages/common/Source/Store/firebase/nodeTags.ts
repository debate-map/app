import {WhereOp, GetDoc, GetDocs, StoreAccessor} from "../../../Commands/node_modules/mobx-firelink";
import {emptyArray_forLoading, CE} from "../../../Commands/node_modules/js-vextensions";
import {MapNodePhrasing} from "./nodePhrasings/@MapNodePhrasing";
import {MapNodeTag, TagComp, GetTagCompClassByTag, GetTagCompOfTag} from "./nodeTags/@MapNodeTag";

// todo: add and use some sort of system where mobx-firelink auto-reattaches data to their classes, based on AJV metadata
export const GetNodeTags = StoreAccessor(s=>(nodeID: string): MapNodeTag[]=>{
	return GetDocs({
		//queryOps: [new WhereOp(`nodes.${nodeID}`, ">", "")], // `if value > ""` means "if key exists"
		queryOps: [new WhereOp(`nodes`, "array-contains", nodeID)],
	}, a=>a.nodeTags);
});
export const GetNodeTag = StoreAccessor(s=>(tagID: string): MapNodeTag=>{
	return GetDoc({}, a=>a.nodeTags.get(tagID));
});

export const GetNodeTagComps = StoreAccessor(s=>(nodeID: string, unwrapCompositeTags = true, tagsToIgnore?: string[]): TagComp[]=>{
	const tags = GetNodeTags(nodeID);
	if (tags == emptyArray_forLoading) return emptyArray_forLoading;
	return CE(tags).SelectMany(tag=>{
		if (tagsToIgnore?.includes(tag._key)) return [];
		const baseComp = GetTagCompOfTag(tag);
		return unwrapCompositeTags ? GetFinalTagCompsForTag(tag) : [baseComp];
	});
});
export const GetFinalTagCompsForTag = StoreAccessor(s=>(tag: MapNodeTag): TagComp[]=>{
	const compClass = GetTagCompClassByTag(tag);
	const comp = GetTagCompOfTag(tag);
	//return comp.As(compClass).GetFinalTagComps();
	return compClass.prototype.GetFinalTagComps.call(comp);
});