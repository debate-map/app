import { MapNodeRevision_Defaultable } from "../nodes/@MapNodeRevision";
export declare enum MapType {
    Private = 10,
    Public = 20,
    Global = 30
}
export declare class Map {
    constructor(initialData: {
        name: string;
        type: MapType;
        creator: string;
    } & Partial<Map>);
    _key: string;
    name: string;
    note: string;
    noteInline: boolean;
    type: MapType;
    rootNode: string;
    defaultExpandDepth: number;
    defaultTimelineID: string;
    requireMapEditorsCanEdit: boolean;
    nodeDefaults: MapNodeRevision_Defaultable;
    featured: boolean;
    editorIDs: string[];
    creator: string;
    createdAt: number;
    edits: number;
    editedAt: number;
    layers: {
        [key: string]: boolean;
    };
    timelines: {
        [key: string]: boolean;
    };
}
export declare const Map_namePattern = "^[a-zA-Z0-9 ,'\"%:.?\\-()\\/]+$";
