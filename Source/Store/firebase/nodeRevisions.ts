import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {MapNodeRevision} from "./nodes/@MapNodeRevision";
import {CachedTransform} from "js-vextensions";

export function GetNodeRevision(id: number) {
	if (id == null || IsNaN(id)) return null;
	return GetData("nodeRevisions", id) as MapNodeRevision;
}
// todo: make this use an actual query, to improve performance
export function GetNodeRevisions(nodeID: number): MapNodeRevision[] {
	let entryMap = GetData("nodeRevisions");
	return CachedTransform("GetNodeRevisions", [nodeID], entryMap, ()=>entryMap ? entryMap.VValues(true).filter(a=>a.node == nodeID) : []);
}