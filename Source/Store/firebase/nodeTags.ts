import {WhereFilter, GetDoc, GetDocs, StoreAccessor} from "mobx-firelink";
import {MapNodePhrasing} from "./nodePhrasings/@MapNodePhrasing";
import {MapNodeTag} from "./nodeTags/@MapNodeTag";

export const GetNodeTags = StoreAccessor(s=>(nodeID: string): MapNodeTag[]=>{
	return GetDocs({
		//filters: [new WhereFilter(`nodes.${nodeID}`, ">", "")], // `if value > ""` means "if key exists"
		filters: [new WhereFilter(`nodes`, "array-contains", nodeID)],
	}, a=>a.nodeTags);
});
export const GetNodeTag = StoreAccessor(s=>(tagID: string): MapNodeTag=>{
	return GetDoc({}, a=>a.nodeTags.get(tagID));
});