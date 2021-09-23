import {GetNode, GetNodeChildLinks, GetNodeChildren, GetNodeChildrenL3, GetNodeL2, GetNodeRevisions, GetNodeTags, GetRatings, MapNodeType, MapNodeView, NodeRatingType} from "dm_common";
import {CatchBail, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetMapView} from "../maps/mapViews/$mapView";

export const GetNodeIDsVisibleInNodeViewExpansionState = CreateAccessor((nodeView: MapNodeView, nodeID: string, includeOneLevelInCollapsed = false)=>{
	if (nodeView == null) return [];
	const result = new Set<string>();
	result.add(nodeID);
	const descendantsToAdd =
		nodeView.expanded ? Object.entries(nodeView.children).SelectMany(([childID, childView])=>GetNodeIDsVisibleInNodeViewExpansionState(childView, childID, includeOneLevelInCollapsed)) :
		includeOneLevelInCollapsed ? Object.keys(nodeView.children) :
		[];
	for (const descendantID of descendantsToAdd) {
		result.add(descendantID);
	}
	return Array.from(result);
});

export const GetPreloadData_ForMapLoad = CreateAccessor((mapID: string)=>{
	console.log("Starting");

	const mapView = GetMapView(mapID);
	if (mapView == null) return;

	let nodeIDs = Object.entries(mapView.rootNodeViews).SelectMany(([id, nodeView])=>{
		return GetNodeIDsVisibleInNodeViewExpansionState(nodeView, id, true);
	}).Distinct();
	// also include the children of the visible nodes (since these are loaded to find the displayed child-counts)
	/*const nodes_childIDs = nodeIDs.SelectMany(a=>GetNodeChildLinks(a).map(b=>b.child));
	nodeIDs = nodeIDs.concat(nodes_childIDs).Distinct();*/

	for (const nodeID of nodeIDs) {
		/*TryCatch_Log(()=>GetNode(nodeID));
		TryCatch_Log(()=>GetNodeChildLinks(nodeID));*/

		// catch bails, so that all requests are made at once

		const node = GetNode.CatchBail(null, nodeID);
		GetNodeL2.CatchBail(null, nodeID);
		GetNodeRevisions.CatchBail(null, nodeID);
		GetNodeTags.CatchBail(null, nodeID);
		
		/*if (node) {
			if (node.type == MapNodeType.claim) {
			}
		}*/
		//GetRatings.CatchBail(null, nodeID, NodeRatingType.truth);
		//GetRatings.CatchBail(null, nodeID, NodeRatingType.relevance);

		GetNodeChildLinks.CatchBail(null, nodeID);
		CatchBail(null, ()=>GetNodeChildrenL3.CatchItemBails(null, nodeID));
	}

	console.log("Done @nodeCount:", nodeIDs.length, "@nodeIDs:", nodeIDs);
});

/*function TryCatch_Log(func: ()=>any) {
	try {
		return func();
	} catch (ex) {
		console.error("TryCatch_Log_error:", ex, "@func:", func);
		throw ex;
	}
}*/