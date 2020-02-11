import { Command } from "mobx-firelink";
import { MapNode } from "../Store/firebase/nodes/@MapNode";
export declare class UpdateNodeChildrenOrder extends Command<{
    mapID?: string;
    nodeID: string;
    childrenOrder: string[];
}, {}> {
    oldNodeData: MapNode;
    newNodeData: MapNode;
    Validate(): void;
    GetDBUpdates(): {};
}
