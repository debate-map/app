import {GetDoc, StoreAccessor} from "../../../Commands/node_modules/mobx-firelink";

export const GetUserMapInfo = StoreAccessor(s=>(userID: string, mapID: string)=>{
	if (userID == null) return null;
	return GetDoc({}, a=>a.userMapInfo.get(userID))?.maps.get(mapID);
});
export const GetUserLayerStatesForMap = StoreAccessor(s=>(userID: string, mapID: string)=>{
	if (userID == null) return null;
	return GetDoc({}, a=>a.userMapInfo.get(userID))?.maps.get(mapID)?.layerStates;
});
export const GetUserLayerStateForMap = StoreAccessor(s=>(userID: string, mapID: string, layerID: string)=>{
	/* if (userID == null) return null;
	return GetData("userMapInfo", userID, `.${mapID}`, "layerStates", layerID) as boolean; */
	// temp fix for that the direct approach above does not update the Connect() props, for some reason
	const userLayerStates = GetUserLayerStatesForMap(userID, mapID);
	if (userLayerStates == null) return null;
	return userLayerStates[layerID];
});