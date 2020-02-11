import { MapNodeRevision } from "../nodes/@MapNodeRevision";
import { MapNodeL2 } from "../nodes/@MapNode";
export declare enum AttachmentType {
    None = 10,
    Equation = 20,
    References = 30,
    Quote = 40,
    Image = 50
}
export declare function GetAttachmentType(node: MapNodeL2): AttachmentType;
export declare function GetAttachmentType_Revision(revision: MapNodeRevision): AttachmentType;
export declare function ResetNodeRevisionAttachment(revision: MapNodeRevision, attachmentType: AttachmentType): void;
