import {GetData} from "../../Frame/Database/DatabaseHelpers";
import { UserMapInfo, LayerStatesMap } from "./userMapInfo/@UserMapInfo";

export function GetUserMapInfo(userID: string, mapID: number) {
	if (userID == null) return null;
	return GetData("userMapInfo", userID, mapID) as UserMapInfo;
}
export function GetUserLayerStatesForMap(userID: string, mapID: number) {
	if (userID == null) return null;
	return GetData("userMapInfo", userID, mapID, "layerStates") as LayerStatesMap;
}
export function GetUserLayerStateForMap(userID: string, mapID: number, layerID: number) {
	/*if (userID == null) return null;
	return GetData("userMapInfo", userID, mapID, "layerStates", layerID) as boolean;*/
	// temp fix for that the direct approach above does not update the Connect() props, for some reason
	let userLayerStates = GetUserLayerStatesForMap(userID, mapID);
	if (userLayerStates == null) return null;
	return userLayerStates[layerID];
}