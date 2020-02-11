import { Command } from "mobx-firelink";
import { AddNodeRevision } from "./AddNodeRevision";
import { MapNodeL2, MapNode } from "../Store/firebase/nodes/@MapNode";
export declare class SetNodeIsMultiPremiseArgument extends Command<{
    mapID?: string;
    nodeID: string;
    multiPremiseArgument: boolean;
}, {}> {
    oldNodeData: MapNodeL2;
    newNodeData: MapNode;
    sub_addRevision: AddNodeRevision;
    Validate(): void;
    GetDBUpdates(): {};
}
