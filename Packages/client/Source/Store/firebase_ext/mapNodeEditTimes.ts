import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {emptyArray, CE} from "web-vcore/nm/js-vextensions";
import {GetMapNodeEditTimes, GetRootNodeID, GetNode, SearchUpFromNodeForNodeMatchingX, GetNodeID, MapNode, ChangeType} from "dm_common";
import {GetLastAcknowledgementTime} from "../main/maps";

export const GetNodeIDsChangedSinceX = StoreAccessor(s=>(mapID: string, sinceTime: number, includeAcknowledgement = true): string[]=>{
	const nodeEditTimes = GetMapNodeEditTimes(mapID);
	if (nodeEditTimes == null) return emptyArray;

	const result = [] as string[];
	for (const {key: nodeID, value: editTime} of CE(nodeEditTimes).Pairs()) {
		const lastAcknowledgementTime = includeAcknowledgement ? GetLastAcknowledgementTime(nodeID) : 0;
		const sinceTimeForNode = CE(sinceTime).KeepAtLeast(lastAcknowledgementTime);
		if (editTime > sinceTimeForNode) {
			result.push(nodeID);
		}
	}
	return result;
});
export const GetPathsToNodesChangedSinceX = StoreAccessor(s=>(mapID: string, time: number, includeAcknowledgement = true)=>{
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
export const GetPathsToChangedDescendantNodes_WithChangeTypes = StoreAccessor(s=>(mapID: string, sinceTime: number, path: string, includeAcknowledgement = true)=>{
	const pathsToChangedNodes = GetPathsToNodesChangedSinceX(mapID, sinceTime, includeAcknowledgement);
	const pathsToChangedDescendantNodes = pathsToChangedNodes.filter(a=>a.startsWith(`${path}/`));
	// const changeTypesOfChangedDescendantNodes = pathsToChangedDescendantNodes.map(path => GetNodeChangeType(GetNode(GetNodeID(path)), sinceTime));
	const changeTypesOfChangedDescendantNodes = pathsToChangedDescendantNodes.map(path=>GetNodeChangeType(GetNode(GetNodeID(path)), sinceTime));
	return changeTypesOfChangedDescendantNodes;
});

export const GetNodeChangeType = StoreAccessor(s=>(node: MapNode, sinceTime: number, includeAcknowledgement = true)=>{
	const lastAcknowledgementTime = includeAcknowledgement ? GetLastAcknowledgementTime(node._key) : 0;
	const sinceTimeForNode = CE(sinceTime).KeepAtLeast(lastAcknowledgementTime);
	if (node.createdAt >= sinceTimeForNode) return ChangeType.Add;
	return ChangeType.Edit;
});