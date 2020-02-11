import { Map } from "./@Map";
export declare function IsUserMap(map: Map): boolean;
export declare const GetRootNodeID: ((mapID: string) => string) & {
    Wait: (mapID: string) => string;
};
export declare const GetMapEditorIDs: ((mapID: string) => string[]) & {
    Wait: (mapID: string) => string[];
};
export declare const GetMapEditors: ((mapID: string) => import("../users/@User").User[]) & {
    Wait: (mapID: string) => import("../users/@User").User[];
};
