import { Command } from "mobx-firelink";
import { DeleteNode } from "../DeleteNode";
import { MapNode } from "../../Store/firebase/nodes/@MapNode";
export declare function GetNodesInSubtree(rootNodeID: string, runInfo?: {
    nodesVisited: Set<string>;
}): any[];
export declare class DeleteNodeSubtree extends Command<{
    nodeID: string;
    maxDeletes: number;
}, {}> {
    nodesInSubtree: MapNode[];
    subs_deleteNodes: DeleteNode[];
    Validate(): void;
    GetDBUpdates(): {};
}
