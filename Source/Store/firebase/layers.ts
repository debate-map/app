import {Map} from "./maps/@Map";
import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {MapNode} from "./nodes/@MapNode";
import {CachedTransform} from "../../Frame/V/VCache";
import {Layer} from "Store/firebase/layers/@Layer";
import {GetNode} from "Store/firebase/nodes";
import {GetNodeEnhanced} from "./nodes/$node";
import {GetUserLayerStatesForMap} from "./userMapInfo";
import {emptyArray} from "../../Frame/Store/ReducerUtils";

export function GetLayers(): Layer[] {
	let layersMap = GetData("layers");
	return CachedTransform("GetLayers", [], layersMap, ()=>layersMap ? layersMap.VValues(true) : []);
}
export function GetLayer(id: number): Layer {
	if (id == null) return null;
	return GetData("maps", id);
}

export function GetMapLayerIDs(map: Map) {
	return (map.layers || {}).VKeys(true).map(ToInt);
}
export function GetMapLayers(map: Map) {
	let layers = GetMapLayerIDs(map).map(id=>GetLayer(id));
	return CachedTransform("GetLayersForMap", [map._id], layers, ()=>layers);
}

export function GetSubnodeIDsInLayer(anchorNodeID: number, layerID: number) {
	return (GetData("layers", layerID, "nodeSubnodes", anchorNodeID) || {}).VKeys(true).map(ToInt);
}
export function GetSubnodesInLayer(anchorNodeID: number, layerID: number) {
	let subnodeIDs = GetSubnodeIDsInLayer(anchorNodeID, layerID);
	let subnodes = subnodeIDs.map(id=>GetNode(id));
	return CachedTransform("GetSubnodesInLayer", [anchorNodeID, layerID], subnodes, ()=>subnodes);
}
/*export function GetSubnodesInLayerEnhanced(anchorNodeID: number, layerID: number) {
	let subnodes = GetSubnodesInLayer(anchorNodeID, layerID);
	let subnodesEnhanced = subnodes.map(child=> {
		if (child == null) return null;
		return {...child, finalType: child.type, link: null};
	});
	return CachedTransform("GetSubnodesInLayerEnhanced", [anchorNodeID, layerID], subnodesEnhanced, ()=>subnodesEnhanced);
}*/

export function GetSubnodesInEnabledLayersEnhanced(userID: string, map: Map, anchorNodeID: number) {
	let layersEnabled = GetMapLayers(map);
	let userLayerStates = GetUserLayerStatesForMap(userID, map._id) || {};
	for (let {name: layerIDStr, value: state} of userLayerStates.Props(true)) {
		let layerID = layerIDStr.ToInt();
		let existingEntry = layersEnabled.find(a=>a._id == layerID);
		if (state == true) {
			if (existingEntry == null) {
				layersEnabled.push(GetLayer(layerID));
			}
		} else {
			if (existingEntry != null) {
				layersEnabled.Remove(existingEntry);
			}
		}
	}
	// if some layers aren't loaded yet, return nothing
	//if (layersEnabled.Any(a=>a == null)) return emptyArray;

	let subnodeIDs = [];
	for (let layer of layersEnabled) {
		subnodeIDs.AddRange(GetSubnodeIDsInLayer(anchorNodeID, layer._id));
	}
	let subnodesEnhanced = subnodeIDs.map(id=> {
		let child = GetNode(id);
		if (child == null) return null;
		return {...child, finalType: child.type, link: null};
	});
	return CachedTransform("GetSubnodesInEnabledLayersEnhanced", [map._id, userID, anchorNodeID], subnodesEnhanced, ()=>subnodesEnhanced);
}