export declare const GetUserMapInfo: ((userID: string, mapID: string) => import("./userMapInfo/@UserMapInfo").UserMapInfo) & {
    Wait: (userID: string, mapID: string) => import("./userMapInfo/@UserMapInfo").UserMapInfo;
};
export declare const GetUserLayerStatesForMap: ((userID: string, mapID: string) => import("./userMapInfo/@UserMapInfo").LayerStatesMap) & {
    Wait: (userID: string, mapID: string) => import("./userMapInfo/@UserMapInfo").LayerStatesMap;
};
export declare const GetUserLayerStateForMap: ((userID: string, mapID: string, layerID: string) => any) & {
    Wait: (userID: string, mapID: string, layerID: string) => any;
};
