import { MapNodeRevision, TitleKey } from "./nodes/@MapNodeRevision";
export declare const GetNodeRevision: ((id: string) => MapNodeRevision) & {
    Wait: (id: string) => MapNodeRevision;
};
export declare const GetNodeRevisions: ((nodeID: string) => MapNodeRevision[]) & {
    Wait: (nodeID: string) => MapNodeRevision[];
};
export declare const GetNodeRevisionsByTitle: ((title: string, titleKey: TitleKey) => MapNodeRevision[]) & {
    Wait: (title: string, titleKey: TitleKey) => MapNodeRevision[];
};
