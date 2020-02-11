import {CachedTransform, emptyArray, ToInt, emptyArray_forLoading, CE} from "js-vextensions";
import {GetDoc, GetDocs, StoreAccessor} from "mobx-firelink";
import {Map} from "./maps/@Map";
import {AsNodeL3, GetNodeL2} from "./nodes/$node";
import {GetUserLayerStatesForMap} from "./userMapInfo";
import {MapNodeL3} from "./nodes/@MapNode";
import {GetMap} from "./maps";
import {Layer} from "./layers/@Layer";
import {GetNode} from "./nodes";

export const GetLayers = StoreAccessor(s=>(): Layer[]=>{
	return GetDocs({}, a=>a.layers);
});
export const GetLayer = StoreAccessor(s=>(id: string): Layer=>{
	return GetDoc({}, a=>a.layers.get(id));
});

export function GetMapLayerIDs(mapID: string) {
	const map = GetMap(mapID);
	if (map == null) return null;
	return map.layers ? CE(map.layers).VKeys() : emptyArray;
}
export const GetMapLayers = StoreAccessor(s=>(mapID: string)=>{
	return GetMapLayerIDs(mapID).map(id=>GetLayer(id));
});

export const GetSubnodeIDsInLayer = StoreAccessor(s=>(anchorNodeID: string, layerID: string)=>{
	return CE(GetDoc({}, a=>a.layers.get(layerID).nodeSubnodes.get(anchorNodeID)) || {}).VKeys();
});
export const GetSubnodesInLayer = StoreAccessor(s=>(anchorNodeID: string, layerID: string)=>{
	const subnodeIDs = GetSubnodeIDsInLayer(anchorNodeID, layerID);
	return subnodeIDs.map(id=>GetNode(id));
});
/* export function GetSubnodesInLayerEnhanced(anchorNodeID: string, layerID: string) {
	let subnodes = GetSubnodesInLayer(anchorNodeID, layerID);
	let subnodesEnhanced = subnodes.map(child=> {
		if (child == null) return null;
		return {...child, finalType: child.type, link: null};
	});
	return CachedTransform("GetSubnodesInLayerEnhanced", [anchorNodeID, layerID], subnodesEnhanced, ()=>subnodesEnhanced);
} */

export const GetSubnodesInEnabledLayersEnhanced = StoreAccessor(s=>(userID: string, mapID: string, anchorNodeID: string): MapNodeL3[]=>{
	const layersEnabled = GetMapLayers(mapID);
	// if some layers aren't loaded yet, return nothing
	if (CE(layersEnabled).Any(a=>a == null)) return emptyArray_forLoading;

	// const userLayerStates = GetUserLayerStatesForMap(userID, map._key) || {};
	const userLayerStates = GetUserLayerStatesForMap(userID, mapID);
	if (userLayerStates != null) {
		for (const {key: layerID, value: state} of CE(userLayerStates).Pairs()) {
			const existingEntry = layersEnabled.find(a=>a._key == layerID);
			if (state == true) {
				if (existingEntry == null) {
					layersEnabled.push(GetLayer(layerID));
				}
			} else if (existingEntry != null) {
				CE(layersEnabled).Remove(existingEntry);
			}
		}
	}

	const subnodeIDs = [];
	for (const layer of layersEnabled) {
		subnodeIDs.push(...GetSubnodeIDsInLayer(anchorNodeID, layer._key));
	}
	const subnodesL3 = subnodeIDs.map(id=>{
		const child = GetNodeL2(id);
		if (child == null) return null;
		return AsNodeL3(child);
	});
	return subnodesL3;
});

export const ForDeleteLayer_GetError = StoreAccessor(s=>(userID: string, layer: Layer)=>{
	if (CE(layer.nodeSubnodes || {}).VKeys().length) return "Cannot delete layer until all the subnodes within it are deleted.";
});