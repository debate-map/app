import { Command } from "mobx-firelink";
import { AddChildNode } from "./AddChildNode";
import { DeleteNode } from "./DeleteNode";
import { LinkNode } from "./LinkNode";
import { UnlinkNode } from "./UnlinkNode";
import { UUID } from "mobx-firelink";
import { ClaimForm, Polarity, MapNode } from "../Store/firebase/nodes/@MapNode";
import { Map } from "../Store/firebase/maps/@Map";
declare type Payload = {
    mapID: string;
    oldParentID: string;
    newParentID: string;
    nodeID: string;
    newForm?: ClaimForm;
    newPolarity?: Polarity;
    allowCreateWrapperArg?: boolean;
    unlinkFromOldParent?: boolean;
    deleteEmptyArgumentWrapper?: boolean;
};
export declare function CreateLinkCommand(mapID: UUID, draggedNodePath: string, dropOnNodePath: string, polarity: Polarity, asCopy: boolean): LinkNode_HighLevel;
export declare class LinkNode_HighLevel extends Command<Payload, {
    argumentWrapperID?: string;
}> {
    static defaultPayload: {
        allowCreateWrapperArg: boolean;
    };
    map_data: Map;
    node_data: MapNode;
    newParent_data: MapNode;
    sub_addArgumentWrapper: AddChildNode;
    sub_linkToNewParent: LinkNode;
    sub_unlinkFromOldParent: UnlinkNode;
    sub_deleteOldParent: DeleteNode;
    Validate(): void;
    GetDBUpdates(): {};
}
export {};
