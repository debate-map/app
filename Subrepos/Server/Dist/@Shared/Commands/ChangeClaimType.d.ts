import { Command } from "mobx-firelink";
import { AttachmentType } from "../Store/firebase/nodeRevisions/@AttachmentType";
import { MapNode } from "../Store/firebase/nodes/@MapNode";
import { MapNodeRevision } from "../Store/firebase/nodes/@MapNodeRevision";
export declare const conversionTypes: string[];
export declare function CanConvertFromClaimTypeXToY(from: AttachmentType, to: AttachmentType): boolean;
export declare class ChangeClaimType extends Command<{
    mapID?: string;
    nodeID: string;
    newType: AttachmentType;
}, {}> {
    oldType: AttachmentType;
    newData: MapNode;
    newRevision: MapNodeRevision;
    newRevisionID: string;
    Validate(): void;
    GetDBUpdates(): {};
}
