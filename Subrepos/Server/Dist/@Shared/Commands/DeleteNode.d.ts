import { Command } from "mobx-firelink";
import { MapNodeL2 } from "../Store/firebase/nodes/@MapNode";
import { MapNodeRevision } from "../Store/firebase/nodes/@MapNodeRevision";
export declare class DeleteNode extends Command<{
    mapID?: string;
    nodeID: string;
    withContainerArgument?: string;
}, {}> {
    asPartOfMapDelete: boolean;
    parentsToIgnore: string[];
    childrenToIgnore: string[];
    sub_deleteContainerArgument: DeleteNode;
    oldData: MapNodeL2;
    oldRevisions: MapNodeRevision[];
    oldParentChildrenOrders: string[][];
    mapIDs: string[];
    Validate(): void;
    GetDBUpdates(): {};
}
