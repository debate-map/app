import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {emptyArray, CE, eal} from "web-vcore/nm/js-vextensions.js";
import {GetMapNodeEdits, GetRootNodeID, GetNode, SearchUpFromNodeForNodeMatchingX, GetNodeID, MapNode, ChangeType, MapNodeL3, GetNodeL2, MapNodeL2} from "dm_common";
import {GetLastAcknowledgementTime} from "../main/maps.js";

// Why is this needed, when we can just directly call GetNodeChangeType() for each node? Well, because we also want to see change-markers for not-yet-expanded descendant paths.
export const GetNodeIDsChangedSinceX = CreateAccessor((mapID: string, sinceTime: number, includeAcknowledgement = true): string[]=>{
	const nodeEdits = GetMapNodeEdits(mapID);
	if (nodeEdits == null) return emptyArray;

	const result = [] as string[];
	for (const [nodeID, edit] of Object.entries(nodeEdits)) {
		const lastAcknowledgementTime = includeAcknowledgement ? GetLastAcknowledgementTime(nodeID) : 0;
		const sinceTimeForNode = CE(sinceTime).KeepAtLeast(lastAcknowledgementTime);
		if (edit.time > sinceTimeForNode) {
			result.push(nodeID);
		}
	}
	return result;
});
export const GetPathsToNodesChangedSinceX = CreateAccessor((mapID: string, time: number, includeAcknowledgement = true)=>{
	// return CachedTransform_WithStore('GetPathsToNodesChangedSinceX', [mapID, time, includeAcknowledgement], {}, () => {
	const nodeIDs = GetNodeIDsChangedSinceX(mapID, time, includeAcknowledgement);
	const mapRootNodeID = GetRootNodeID(mapID);
	if (mapRootNodeID == null) return emptyArray;

	const result = [] as string[];
	for (const nodeID of nodeIDs) {
		const node = GetNode(nodeID);
		if (node == null) return emptyArray;
		const pathToRoot = SearchUpFromNodeForNodeMatchingX(nodeID, id=>id == mapRootNodeID);
		if (pathToRoot == null) return emptyArray;
		result.push(pathToRoot);
	}
	return result;
});
/* export const GetPathsToNodesChangedSinceX = StoreAccessor((mapID: string, time: number, includeAcknowledgement = true) => {
	// return CachedTransform_WithStore('GetPathsToNodesChangedSinceX', [mapID, time, includeAcknowledgement], {}, () => {
	// return SubWatch('GetPathsToNodesChangedSinceX', [mapID, time, includeAcknowledgement], [], () => {
	const nodeIDs = GetNodeIDsChangedSinceX(mapID, time, includeAcknowledgement);
	const mapRootNodeID = GetRootNodeID(mapID);
	if (mapRootNodeID == null) return emptyArray;

	const result = [] as string[];
	for (const [index, nodeID] of nodeIDs.entries()) {
		const entry = SubWatch('GetPathsToNodesChangedSinceX_1', [mapID, time, includeAcknowledgement], [], () => {
			const node = GetNode(nodeID);
			if (node == null) return null;
			const pathToRoot = GetShortestPathFromRootToNode(mapRootNodeID, node);
			return pathToRoot;
		});
		if (entry == null) return emptyArray; // bail out if any are null
		result.push(entry);
	}
	return result;
}); */
export const GetPathsToChangedDescendantNodes_WithChangeTypes = CreateAccessor(/*{onBail: eal},*/ (mapID: string, sinceTime: number, path: string, includeAcknowledgement = true)=>{
	const pathsToChangedNodes = GetPathsToNodesChangedSinceX(mapID, sinceTime, includeAcknowledgement);
	const pathsToChangedDescendantNodes = pathsToChangedNodes.filter(a=>a.startsWith(`${path}/`));
	//const changeTypesOfChangedDescendantNodes = pathsToChangedDescendantNodes.map(path=>GetNodeChangeType(GetNode.BIN(GetNodeID(path)), sinceTime));
	/*const changeTypesOfChangedDescendantNodes = pathsToChangedDescendantNodes.map(path=>{
		// replace bail with null, since "GetPathsToNodesChangedSinceX()" (its db-data) may reference now-gone nodes (too complex to find+delete all these refs at write-time) // nevermind, it's not so complex
		const node = GetNode.CatchBail(null, GetNodeID(path));
		if (node == null) return null;
		return GetNodeChangeType(node, sinceTime);
	}).filter(a=>a);*/
	//const changeTypesOfChangedDescendantNodes = pathsToChangedDescendantNodes.map(path=>GetNodeChangeType(GetNode(GetNodeID(path))!, sinceTime));
	const changeTypesOfChangedDescendantNodes = pathsToChangedDescendantNodes.map(path=>{
		//const node = GetNode(GetNodeID(path))!; // we know node exists, because of the fk-constraint on mapNodeEdit.node
		const node = GetNodeL2(GetNodeID(path))!; // we know node exists, because of the fk-constraint on mapNodeEdit.node
		return GetNodeChangeType(node, sinceTime);
	});
	return changeTypesOfChangedDescendantNodes;
});

export const GetNodeChangeType = CreateAccessor((node: MapNodeL2, sinceTime: number, includeAcknowledgement = true)=>{
	const lastAcknowledgementTime = includeAcknowledgement ? GetLastAcknowledgementTime(node.id) : 0;
	const sinceTimeForNode = CE(sinceTime).KeepAtLeast(lastAcknowledgementTime);
	if (node.createdAt >= sinceTimeForNode) return ChangeType.add;
	else if (node.current.createdAt > sinceTime) return ChangeType.edit;
	//if (?) return ChangeType.remove;
	return null;
});