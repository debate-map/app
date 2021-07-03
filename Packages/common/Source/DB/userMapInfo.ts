import {GetDoc, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";

export const GetUserMapInfo = CreateAccessor(c=>(userID: string, mapID: string)=>{
	if (userID == null) return null;
	//return GetDoc({}, a=>a.userMapInfo.get(userID))?.maps.get(mapID);
	return null;
});
export const GetUserLayerStatesForMap = CreateAccessor(c=>(userID: string, mapID: string)=>{
	if (userID == null) return null;
	//return GetDoc({}, a=>a.userMapInfo.get(userID))?.maps.get(mapID)?.layerStates;
	return null;
});
export const GetUserLayerStateForMap = CreateAccessor(c=>(userID: string, mapID: string, layerID: string)=>{
	/* if (userID == null) return null;
	return GetData("userMapInfo", userID, `.${mapID}`, "layerStates", layerID) as boolean; */
	// temp fix for that the direct approach above does not update the Connect() props, for some reason
	const userLayerStates = GetUserLayerStatesForMap(userID, mapID);
	if (userLayerStates == null) return null;
	return userLayerStates[layerID];
});