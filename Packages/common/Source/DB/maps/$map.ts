import {emptyArray} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetMap} from "../maps.js";
import {GetUser} from "../users.js";
import {Map, MapType} from "./@Map.js";

export function IsUserMap(map: Map) {
	return map.type == MapType.private || map.type == MapType.public;
}

export const GetRootNodeID = CreateAccessor(c=>(mapID: string)=>{
	const map = GetMap(mapID);
	if (map == null) return null;
	return map.rootNode;
});

export const GetMapEditorIDs = CreateAccessor(c=>(mapID: string)=>{
	const map = GetMap(mapID);
	if (map == null) return null;
	return map.editors ?? emptyArray;
});
export const GetMapEditors = CreateAccessor(c=>(mapID: string)=>{
	return GetMapEditorIDs.BIN(mapID).map(id=>GetUser(id));
});