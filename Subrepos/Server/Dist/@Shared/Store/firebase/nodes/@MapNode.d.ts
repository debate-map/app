import { UUID } from "mobx-firelink";
import { MapNodeRevision } from "./@MapNodeRevision";
import { MapNodeType } from "./@MapNodeType";
export declare const globalMapID = "GLOBAL_MAP_00000000001";
export declare const globalRootNodeID = "GLOBAL_ROOT_0000000001";
export declare enum AccessLevel {
    Basic = 10,
    Verified = 20,
    Mod = 30,
    Admin = 40
}
export declare enum ClaimForm {
    Base = 10,
    Negation = 20,
    YesNoQuestion = 30
}
export declare class MapNode {
    constructor(initialData: {
        type: MapNodeType;
    } & Partial<MapNode>);
    _key?: string;
    type?: MapNodeType;
    creator?: string;
    createdAt: number;
    rootNodeForMap?: string;
    ownerMapID?: string;
    currentRevision: string;
    parents: ParentSet;
    children: ChildSet;
    childrenOrder: UUID[];
    multiPremiseArgument?: boolean;
    layerPlusAnchorParents: LayerPlusAnchorParentSet;
    informalArgumentsHolder?: boolean;
    premiseAddHelper?: boolean;
}
/** MapNode, except with the current-revision data attached. */
export interface MapNodeL2 extends MapNode {
    current: MapNodeRevision;
}
/** MapNodeL2, except with positional data (and derivations, eg. display-polarity) attached. */
export interface MapNodeL3 extends MapNodeL2 {
    /** For this node (with the given ancestors): How the node would be displayed -- "supporting" being green, "opposing" being red. */
    displayPolarity: Polarity;
    link: ChildEntry;
}
export declare enum Polarity {
    Supporting = 10,
    Opposing = 20
}
export declare type ParentSet = {
    [key: string]: ParentEntry;
};
export declare type ParentEntry = {
    _: boolean;
};
export declare type ChildSet = {
    [key: string]: ChildEntry;
};
export declare type ChildEntry = {
    _: boolean;
    form?: ClaimForm;
    seriesAnchor?: boolean;
    polarity?: Polarity;
    _mirrorLink?: boolean;
};
export declare type LayerPlusAnchorParentSet = {
    [key: string]: boolean;
};
