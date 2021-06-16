import {emptyArray} from "web-vcore/nm/js-vextensions";
import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {GetMap} from "../maps";
import {GetUser} from "../users";
import {Map, MapType} from "./@Map";

export function IsUserMap(map: Map) {
	return map.type == MapType.Private || map.type == MapType.Public;
}

export const GetRootNodeID = StoreAccessor(s=>(mapID: string): string=>{
	const map = GetMap(mapID);
	if (map == null) return null;
	return map.rootNode;
});

export const GetMapEditorIDs = StoreAccessor(s=>(mapID: string): string[]=>{
	const map = GetMap(mapID);
	if (map == null) return null;
	return map.editorIDs ?? emptyArray;
});
export const GetMapEditors = StoreAccessor(s=>(mapID: string)=>{
	return GetMapEditorIDs(mapID).map(id=>GetUser(id));
});