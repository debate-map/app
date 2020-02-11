import { MapNodePhrasing } from "./nodePhrasings/@MapNodePhrasing";
export declare const GetNodePhrasings: ((nodeID: string) => MapNodePhrasing[]) & {
    Wait: (nodeID: string) => MapNodePhrasing[];
};
export declare const GetNodePhrasing: ((phrasingID: string) => MapNodePhrasing) & {
    Wait: (phrasingID: string) => MapNodePhrasing;
};
