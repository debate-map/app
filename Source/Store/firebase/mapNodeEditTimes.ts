import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {ShowChangesSinceType} from "../main/maps/@MapInfo";
import {GetRootNodeID} from "./maps";
import {emptyArray} from "../../Frame/Store/ReducerUtils";
import {GetShortestPathFromRootToNode} from "Frame/Store/PathFinder";
import {GetNode} from "Store/firebase/nodes";
import {CachedTransform_WithStore} from "Frame/Database/DatabaseHelpers";
import {MapNode} from "./nodes/@MapNode";
import {GetLastAcknowledgementTime} from "../main";

export class NodeEditTimes {
	//[key: number]: ChangeInfo;
	[key: number]: number;
}

export enum ChangeType {
	Add = 10,
	Edit = 20,
	Remove = 30,
}
/*export class ChangeInfo {
	type: ChangeType;
	time: number;
}*/

let colorMap = {
	[ChangeType.Add]: "0,255,0",
	//[ChangeType.Edit]: "255,255,0",
	[ChangeType.Edit]: "255,255,0",
	[ChangeType.Remove]: "255,0,0",
};
export function GetChangeTypeOutlineColor(changeType: ChangeType) {
	if (changeType == null) return null;
	return colorMap[changeType];
}

export function GetMapNodeEditTimes(mapID: number) {
	return GetData("mapNodeEditTimes", mapID) as NodeEditTimes;
}

export function GetNodeIDsChangedSinceX(mapID: number, sinceTime: number, includeAcknowledgement = true) {
	let nodeEditTimes = GetMapNodeEditTimes(mapID);
	if (nodeEditTimes == null) return emptyArray;

	let result = [] as number[];
	for (let {name: nodeIDStr, value: editTime} of nodeEditTimes.Props(true)) {
		let nodeID = nodeIDStr.ToInt();
		let lastAcknowledgementTime = includeAcknowledgement ? GetLastAcknowledgementTime(nodeID) : 0;
		let sinceTimeForNode = sinceTime.KeepAtLeast(lastAcknowledgementTime);
		if (editTime > sinceTimeForNode) {
			result.push(nodeID);
		}
	}
	return result;
}
export function GetPathsToNodesChangedSinceX(mapID: number, time: number, includeAcknowledgement = true) {
	return CachedTransform_WithStore("GetPathsToNodesChangedSinceX", [mapID, time], {}, ()=> {
		let nodeIDs = GetNodeIDsChangedSinceX(mapID, time, includeAcknowledgement);
		let mapRootNodeID = GetRootNodeID(mapID);
		if (mapRootNodeID == null) return emptyArray;
		
		let result = [] as string[];
		for (let nodeID of nodeIDs) {
			let node = GetNode(nodeID);
			if (node == null) return emptyArray;
			let pathToRoot = GetShortestPathFromRootToNode(mapRootNodeID, node);
			if (pathToRoot == null) return emptyArray;
			result.push(pathToRoot);
		}
		return result;
	});
}
export function GetNodeChangeType(node: MapNode, sinceTime: number, includeAcknowledgement = true) {
	let lastAcknowledgementTime = includeAcknowledgement ? GetLastAcknowledgementTime(node._id) : 0;
	let sinceTimeForNode = sinceTime.KeepAtLeast(lastAcknowledgementTime);
	if (node.createdAt >= sinceTimeForNode) return ChangeType.Add;
	return ChangeType.Edit;
}