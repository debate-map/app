import { RatingType } from "../nodeRatings/@RatingType";
import { HolderType } from "../nodes";
import { ChildEntry, ClaimForm, MapNode, MapNodeL2, MapNodeL3, Polarity } from "./@MapNode";
import { MapNodeRevision } from "./@MapNodeRevision";
import { MapNodeType } from "./@MapNodeType";
import { PermissionGroupSet } from "../users/@User";
export declare function PreProcessLatex(text: string): string;
export declare function GetFontSizeForNode(node: MapNodeL2, isSubnode?: boolean): number;
export declare function GetPaddingForNode(node: MapNodeL2, isSubnode?: boolean): "1px 4px 2px" | "5px 5px 4px";
export declare type RatingTypeInfo = {
    type: RatingType;
    main?: boolean;
    collapsed?: boolean;
};
export declare function GetRatingTypesForNode(node: MapNodeL2): RatingTypeInfo[];
export declare const GetMainRatingType: ((node: MapNodeL2) => RatingType) & {
    Wait: (node: MapNodeL2) => RatingType;
};
export declare function GetSortByRatingType(node: MapNodeL3): RatingType;
export declare function ReversePolarity(polarity: Polarity): Polarity;
export declare const GetDisplayPolarityAtPath: ((node: MapNodeL2, path: string, tagsToIgnore?: string[]) => Polarity) & {
    Wait: (node: MapNodeL2, path: string, tagsToIgnore?: string[]) => Polarity;
};
export declare function GetDisplayPolarity(basePolarity: Polarity, parentForm: ClaimForm): Polarity;
export declare function IsNodeL1(node: any): node is MapNode;
export declare function AsNodeL1(node: MapNodeL2 | MapNodeL3): MapNode;
export declare function IsNodeL2(node: MapNode): node is MapNodeL2;
export declare function AsNodeL2(node: MapNode, currentRevision: MapNodeRevision): MapNodeL2;
export declare const GetNodeL2: ((nodeID: string | MapNode, path?: string) => MapNodeL2) & {
    Wait: (nodeID: string | MapNode, path?: string) => MapNodeL2;
};
export declare function IsNodeL3(node: MapNode): node is MapNodeL3;
export declare function AsNodeL3(node: MapNodeL2, displayPolarity?: Polarity, link?: ChildEntry): MapNodeL3;
export declare const GetNodeL3: ((path: string, tagsToIgnore?: string[]) => MapNodeL3) & {
    Wait: (path: string, tagsToIgnore?: string[]) => MapNodeL3;
};
export declare const GetNodeForm: ((node: MapNodeL3 | MapNodeL2, pathOrParent?: string | MapNodeL2) => ClaimForm) & {
    Wait: (node: MapNodeL3 | MapNodeL2, pathOrParent?: string | MapNodeL2) => ClaimForm;
};
export declare const GetLinkUnderParent: ((nodeID: string, parent: MapNode, includeMirrorLinks?: any, tagsToIgnore?: string[]) => ChildEntry) & {
    Wait: (nodeID: string, parent: MapNode, includeMirrorLinks?: any, tagsToIgnore?: string[]) => ChildEntry;
};
export declare function GetLinkAtPath(path: string): ChildEntry;
export declare class NodeContributionInfo {
    constructor(nodeID: string);
    proArgs: NodeContributionInfo_ForPolarity;
    conArgs: NodeContributionInfo_ForPolarity;
}
export declare class NodeContributionInfo_ForPolarity {
    constructor(nodeID: string);
    canAdd: boolean;
    hostNodeID: string;
    reversePolarities: boolean;
}
export declare function GetPolarityShortStr(polarity: Polarity): "pro" | "con";
export declare const GetNodeContributionInfo: ((nodeID: string, userID: string) => NodeContributionInfo) & {
    Wait: (nodeID: string, userID: string) => NodeContributionInfo;
};
export declare function IsNodeTitleValid_GetError(node: MapNode, title: string): string;
export declare function GetAllNodeRevisionTitles(nodeRevision: MapNodeRevision): string[];
/** Gets the main display-text for a node. (doesn't include equation explanation, quote sources, etc.) */
export declare const GetNodeDisplayText: ((node: MapNodeL2, path?: string, form?: ClaimForm) => string) & {
    Wait: (node: MapNodeL2, path?: string, form?: ClaimForm) => string;
};
export declare const missingTitleStrings: string[];
export declare function GetValidChildTypes(nodeType: MapNodeType, path: string): MapNodeType[];
export declare function GetValidNewChildTypes(parent: MapNodeL2, holderType: HolderType, permissions: PermissionGroupSet): MapNodeType[];
/** Returns whether the node provided is an argument, and marked as single-premise. */
export declare const IsSinglePremiseArgument: ((node: MapNode) => boolean) & {
    Wait: (node: MapNode) => boolean;
};
/** Returns whether the node provided is an argument, and marked as multi-premise. */
export declare const IsMultiPremiseArgument: ((node: MapNode) => boolean) & {
    Wait: (node: MapNode) => boolean;
};
export declare const IsPremiseOfSinglePremiseArgument: ((node: MapNode, parent: MapNode) => boolean) & {
    Wait: (node: MapNode, parent: MapNode) => boolean;
};
export declare function IsPremiseOfMultiPremiseArgument(node: MapNode, parent: MapNode): boolean;
