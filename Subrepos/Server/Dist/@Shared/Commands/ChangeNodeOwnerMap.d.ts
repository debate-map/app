import { Command } from "mobx-firelink";
import { MapNode } from "../Store/firebase/nodes/@MapNode";
export declare class ChangeNodeOwnerMap extends Command<{
    nodeID: string;
    newOwnerMapID: string;
    argumentNodeID?: string;
}, {}> {
    newData: MapNode;
    sub_changeOwnerMapForArgument: ChangeNodeOwnerMap;
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: MapNode;
    };
}
