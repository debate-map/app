import {WhereFilter, GetDoc, GetDocs, StoreAccessor} from "mobx-firelink";
import {MapNodePhrasing} from "./nodePhrasings/@MapNodePhrasing";

/* export function GetPhrasings(nodeID: string): MapNodePhrasing[] {
	const entryMap = GetData({ collection: true }, 'nodePhrasings', nodeID, 'phrasings');
	return CachedTransform('GetPhrasings', [], entryMap, () => (entryMap ? entryMap.VValues(true) : []));
} */
// todo: make this use an actual query, to improve performance
export const GetNodePhrasings = StoreAccessor(s=>(nodeID: string): MapNodePhrasing[]=>{
	/* const entryMap = GetData({ collection: true }, 'nodePhrasings');
	return entryMap ? entryMap.VValues(true).filter((a) => a && a.node == nodeID) : []; */
	// store.fire.db.nodePhrasings.Get();
	return GetDocs({
		filters: [new WhereFilter("node", "==", nodeID)],
	}, a=>a.nodePhrasings);
});


export const GetNodePhrasing = StoreAccessor(s=>(phrasingID: string): MapNodePhrasing=>{
	return GetDoc({}, a=>a.nodePhrasings.get(phrasingID));
});