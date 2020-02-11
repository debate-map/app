import { GetDoc, StoreAccessor } from "mobx-firelink";
export const GetUserMapInfo = StoreAccessor(s => (userID, mapID) => {
    var _a;
    if (userID == null)
        return null;
    return (_a = GetDoc({}, a => a.userMapInfo.get(userID))) === null || _a === void 0 ? void 0 : _a.maps.get(mapID);
});
export const GetUserLayerStatesForMap = StoreAccessor(s => (userID, mapID) => {
    var _a, _b;
    if (userID == null)
        return null;
    return (_b = (_a = GetDoc({}, a => a.userMapInfo.get(userID))) === null || _a === void 0 ? void 0 : _a.maps.get(mapID)) === null || _b === void 0 ? void 0 : _b.layerStates;
});
export const GetUserLayerStateForMap = StoreAccessor(s => (userID, mapID, layerID) => {
    /* if (userID == null) return null;
    return GetData("userMapInfo", userID, `.${mapID}`, "layerStates", layerID) as boolean; */
    // temp fix for that the direct approach above does not update the Connect() props, for some reason
    const userLayerStates = GetUserLayerStatesForMap(userID, mapID);
    if (userLayerStates == null)
        return null;
    return userLayerStates[layerID];
});
