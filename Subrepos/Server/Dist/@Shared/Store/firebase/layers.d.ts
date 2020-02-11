import { MapNodeL3 } from "./nodes/@MapNode";
import { Layer } from "./layers/@Layer";
export declare const GetLayers: (() => Layer[]) & {
    Wait: () => Layer[];
};
export declare const GetLayer: ((id: string) => Layer) & {
    Wait: (id: string) => Layer;
};
export declare function GetMapLayerIDs(mapID: string): any[];
export declare const GetMapLayers: ((mapID: string) => Layer[]) & {
    Wait: (mapID: string) => Layer[];
};
export declare const GetSubnodeIDsInLayer: ((anchorNodeID: string, layerID: string) => string[]) & {
    Wait: (anchorNodeID: string, layerID: string) => string[];
};
export declare const GetSubnodesInLayer: ((anchorNodeID: string, layerID: string) => import("./nodes/@MapNode").MapNode[]) & {
    Wait: (anchorNodeID: string, layerID: string) => import("./nodes/@MapNode").MapNode[];
};
export declare const GetSubnodesInEnabledLayersEnhanced: ((userID: string, mapID: string, anchorNodeID: string) => MapNodeL3[]) & {
    Wait: (userID: string, mapID: string, anchorNodeID: string) => MapNodeL3[];
};
export declare const ForDeleteLayer_GetError: ((userID: string, layer: Layer) => "Cannot delete layer until all the subnodes within it are deleted.") & {
    Wait: (userID: string, layer: Layer) => "Cannot delete layer until all the subnodes within it are deleted.";
};
