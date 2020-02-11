import { UUID } from "mobx-firelink";
import { MapNode, MapNodeL2, MapNodeL3 } from "./nodes/@MapNode";
import { TitleKey } from "./nodes/@MapNodeRevision";
import { MapNodeType } from "./nodes/@MapNodeType";
import { PermissionGroupSet } from "./users/@User";
export declare enum HolderType {
    Truth = 10,
    Relevance = 20
}
export declare function PathSegmentToNodeID(segment: string): UUID;
export declare const GetNodesByIDs: ((ids: string[], emptyForLoading?: any) => MapNode[]) & {
    Wait: (ids: string[], emptyForLoading?: any) => MapNode[];
};
export declare const GetNodesByTitle: ((title: string, titleKey: TitleKey) => MapNode[]) & {
    Wait: (title: string, titleKey: TitleKey) => MapNode[];
};
export declare const GetNode: ((id: string) => MapNode) & {
    Wait: (id: string) => MapNode;
};
export declare function GetParentCount(node: MapNode): number;
export declare function GetChildCount(node: MapNode): number;
export declare function IsRootNode(node: MapNode): boolean;
export declare function IsNodeSubnode(node: MapNode): boolean;
export declare function GetParentPath(childPath: string): string;
export declare function GetParentNodeID(path: string): string;
export declare const GetParentNode: ((childPath: string) => MapNode) & {
    Wait: (childPath: string) => MapNode;
};
export declare const GetParentNodeL2: ((childPath: string) => MapNodeL2) & {
    Wait: (childPath: string) => MapNodeL2;
};
export declare const GetParentNodeL3: ((childPath: string) => MapNodeL3) & {
    Wait: (childPath: string) => MapNodeL3;
};
export declare const GetNodeID: ((path: string) => string) & {
    Wait: (path: string) => string;
};
export declare const GetNodeParents: ((nodeID: string) => MapNode[]) & {
    Wait: (nodeID: string) => MapNode[];
};
export declare const GetNodeParentsL2: ((nodeID: string) => MapNodeL2[]) & {
    Wait: (nodeID: string) => MapNodeL2[];
};
export declare const GetNodeParentsL3: ((nodeID: string, path: string) => MapNodeL3[]) & {
    Wait: (nodeID: string, path: string) => MapNodeL3[];
};
export declare const GetNodeChildren: ((nodeID: string, includeMirrorChildren?: any, tagsToIgnore?: string[]) => MapNode[]) & {
    Wait: (nodeID: string, includeMirrorChildren?: any, tagsToIgnore?: string[]) => MapNode[];
};
export declare const GetNodeMirrorChildren: ((nodeID: string, tagsToIgnore?: string[]) => MapNode[]) & {
    Wait: (nodeID: string, tagsToIgnore?: string[]) => MapNode[];
};
export declare const GetNodeChildrenL2: ((nodeID: string, includeMirrorChildren?: any, tagsToIgnore?: string[]) => MapNodeL2[]) & {
    Wait: (nodeID: string, includeMirrorChildren?: any, tagsToIgnore?: string[]) => MapNodeL2[];
};
export declare const GetNodeChildrenL3: ((nodeID: string, path?: string, includeMirrorChildren?: any, tagsToIgnore?: string[]) => MapNodeL3[]) & {
    Wait: (nodeID: string, path?: string, includeMirrorChildren?: any, tagsToIgnore?: string[]) => MapNodeL3[];
};
export declare const GetPremiseOfSinglePremiseArgument: ((argumentNodeID: string) => MapNode) & {
    Wait: (argumentNodeID: string) => MapNode;
};
export declare function GetHolderType(childType: MapNodeType, parentType: MapNodeType): HolderType;
export declare const ForLink_GetError: ((parentType: MapNodeType, childType: MapNodeType) => string) & {
    Wait: (parentType: MapNodeType, childType: MapNodeType) => string;
};
export declare const ForNewLink_GetError: ((parentID: string, newChild: Pick<MapNode, "type" | "_key">, permissions: PermissionGroupSet, newHolderType?: HolderType) => string | false) & {
    Wait: (parentID: string, newChild: Pick<MapNode, "type" | "_key">, permissions: PermissionGroupSet, newHolderType?: HolderType) => string | false;
};
export declare const ForDelete_GetError: ((userID: string, node: MapNodeL2, subcommandInfo?: {
    asPartOfMapDelete?: boolean;
    parentsToIgnore?: string[];
    childrenToIgnore?: string[];
}) => string) & {
    Wait: (userID: string, node: MapNodeL2, subcommandInfo?: {
        asPartOfMapDelete?: boolean;
        parentsToIgnore?: string[];
        childrenToIgnore?: string[];
    }) => string;
};
export declare const ForCut_GetError: ((userID: string, node: MapNodeL2) => string) & {
    Wait: (userID: string, node: MapNodeL2) => string;
};
export declare const ForCopy_GetError: ((userID: string, node: MapNode) => "You're not signed in, or lack basic permissions." | "Cannot copy the root-node of a map." | "Cannot copy a subnode.") & {
    Wait: (userID: string, node: MapNode) => "You're not signed in, or lack basic permissions." | "Cannot copy the root-node of a map." | "Cannot copy a subnode.";
};
