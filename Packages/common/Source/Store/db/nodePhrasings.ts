import {emptyArray} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, GetDocs, StoreAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {MapNodePhrasing} from "./nodePhrasings/@MapNodePhrasing.js";

export const GetNodePhrasings = StoreAccessor(s=>(nodeID: string): MapNodePhrasing[]=>{
	/* const entryMap = GetData({ collection: true }, 'nodePhrasings');
	return entryMap ? entryMap.VValues(true).filter((a) => a && a.node == nodeID) : []; */
	// store.fire.db.nodePhrasings.Get();
	/*return GetDocs({
		//queryOps: [new WhereOp("node", "==", nodeID)],
		params: {filter: {
			node: {equalTo: nodeID},
		}}
	}, a=>a.nodePhrasings);*/
	return emptyArray;
});

/* export function GetPhrasings(nodeID: string): MapNodePhrasing[] {
	const entryMap = GetData({ collection: true }, 'nodePhrasings', nodeID, 'phrasings');
	return CachedTransform('GetPhrasings', [], entryMap, () => (entryMap ? entryMap.VValues(true) : []));
} */
export const GetNodePhrasing = StoreAccessor(s=>(phrasingID: string): MapNodePhrasing=>{
	//return GetDoc({}, a=>a.nodePhrasings.get(phrasingID));
	return null;
});