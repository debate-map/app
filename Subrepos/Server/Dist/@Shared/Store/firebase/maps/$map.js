import { emptyArray } from "js-vextensions";
import { StoreAccessor } from "mobx-firelink";
import { GetMap } from "../maps";
import { GetUser } from "../users";
import { MapType } from "./@Map";
export function IsUserMap(map) {
    return map.type == MapType.Private || map.type == MapType.Public;
}
export const GetRootNodeID = StoreAccessor(s => (mapID) => {
    const map = GetMap(mapID);
    if (map == null)
        return null;
    return map.rootNode;
});
export const GetMapEditorIDs = StoreAccessor(s => (mapID) => {
    var _a;
    const map = GetMap(mapID);
    if (map == null)
        return null;
    return _a = map.editorIDs, (_a !== null && _a !== void 0 ? _a : emptyArray);
});
export const GetMapEditors = StoreAccessor(s => (mapID) => {
    return GetMapEditorIDs(mapID).map(id => GetUser(id));
});
