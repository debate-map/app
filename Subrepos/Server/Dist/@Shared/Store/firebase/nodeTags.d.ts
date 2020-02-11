import { MapNodeTag, TagComp } from "./nodeTags/@MapNodeTag";
export declare const GetNodeTags: ((nodeID: string) => MapNodeTag[]) & {
    Wait: (nodeID: string) => MapNodeTag[];
};
export declare const GetNodeTag: ((tagID: string) => MapNodeTag) & {
    Wait: (tagID: string) => MapNodeTag;
};
export declare const GetNodeTagComps: ((nodeID: string, unwrapCompositeTags?: any, tagsToIgnore?: string[]) => TagComp[]) & {
    Wait: (nodeID: string, unwrapCompositeTags?: any, tagsToIgnore?: string[]) => TagComp[];
};
export declare const GetFinalTagCompsForTag: ((tag: MapNodeTag) => TagComp[]) & {
    Wait: (tag: MapNodeTag) => TagComp[];
};
