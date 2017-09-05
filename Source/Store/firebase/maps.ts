import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {Map, MapType} from "./maps/@Map";
import {CachedTransform} from "../../Frame/V/VCache";

export function GetMaps(): Map[] {
	let mapsMap = GetData("maps");
	return CachedTransform("GetMaps", [], mapsMap, ()=>mapsMap ? mapsMap.VValues(true) : []);
}
export function GetMapsOfType(type: MapType): Map[] {
	let mapsMap = GetData("maps");
	return CachedTransform("GetMaps", [type], mapsMap, ()=>mapsMap ? mapsMap.VValues(true).filter(a=>a.type == type) : []);
}
export function GetMap(id: number): Map {
	if (id == null) return null;
	return GetData("maps", id);
}
export function GetRootNodeID(mapID: number): number {
	let map = GetMap(mapID);
	if (map == null) return null;
	return map.rootNode;
}

export function IsUserMap(map: Map) {
	return map.type == MapType.Personal || map.type == MapType.Debate;
}