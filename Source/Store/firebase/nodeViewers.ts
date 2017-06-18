import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {ViewedNodeSet} from "./userViewedNodes/@ViewedNodeSet";
import {ViewerSet} from "./nodeViewers/@ViewerSet";
import {CachedTransform} from "../../Frame/V/VCache";

export function GetNodeViewerSet(nodeID: number) {
	if (nodeID == null) return null;
	return GetData(`nodeViewers/${nodeID}`) as ViewerSet;
}
export function GetNodeViewers(nodeID: number) {
	let viewerSet = GetNodeViewerSet(nodeID);
	return CachedTransform("GetNodeViewers", [nodeID], {viewerSet}, ()=>viewerSet ? viewerSet.VKeys(true) : []);
}