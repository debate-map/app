import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {Map} from "./maps/@Map";

export function GetMap(id: number): Map {
	return GetData(`maps/${id}`);
}
export function GetRootNodeID(mapID: number): number {
	let map = GetMap(mapID);
	if (map == null) return null;
	return map.rootNode;
}