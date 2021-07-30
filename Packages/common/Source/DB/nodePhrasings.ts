import {CreateAccessor, GetDoc, GetDocs} from "web-vcore/nm/mobx-graphlink.js";

export const GetNodePhrasings = CreateAccessor((nodeID: string)=>{
	/* const entryMap = GetData({ collection: true }, 'nodePhrasings');
	return entryMap ? entryMap.VValues(true).filter((a) => a && a.node == nodeID) : []; */
	// store.fire.db.nodePhrasings.Get();
	return GetDocs({
		//queryOps: [new WhereOp("node", "==", nodeID)],
		params: {filter: {
			node: {equalTo: nodeID},
		}},
	}, a=>a.nodePhrasings);
});

/* export function GetPhrasings(nodeID: string): MapNodePhrasing[] {
	const entryMap = GetData({ collection: true }, 'nodePhrasings', nodeID, 'phrasings');
	return CachedTransform('GetPhrasings', [], entryMap, () => (entryMap ? entryMap.VValues(true) : []));
} */
export const GetNodePhrasing = CreateAccessor((id: string)=>{
	return GetDoc({}, a=>a.nodePhrasings.get(id!));
});