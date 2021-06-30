import {emptyArray} from "web-vcore/nm/js-vextensions.js";
import {StoreAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetMap} from "../maps.js";
import {GetUser} from "../users.js";
import {Map, MapType} from "./@Map.js";

export function IsUserMap(map: Map) {
	return map.type == MapType.private || map.type == MapType.public;
}

export const GetRootNodeID = StoreAccessor(s=>(mapID: string): string=>{
	const map = GetMap(mapID);
	if (map == null) return null;
	return map.rootNode;
});

export const GetMapEditorIDs = StoreAccessor(s=>(mapID: string): string[]=>{
	const map = GetMap(mapID);
	if (map == null) return null;
	return map.editors ?? emptyArray;
});
export const GetMapEditors = StoreAccessor(s=>(mapID: string)=>{
	return GetMapEditorIDs(mapID).map(id=>GetUser(id));
});