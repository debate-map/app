import {Map} from "./maps/@Map";
import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {MapNode} from "./nodes/@MapNode";
import {CachedTransform} from "../../Frame/V/VCache";
import {Layer} from "Store/firebase/layers/@Layer";

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