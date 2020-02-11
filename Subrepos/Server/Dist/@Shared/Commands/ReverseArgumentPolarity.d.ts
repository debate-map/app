import { Command } from "mobx-firelink";
import { MapNodeL3, ChildEntry } from "../Store/firebase/nodes/@MapNode";
export declare class ReverseArgumentPolarity extends Command<{
    mapID?: number;
    nodeID: string;
    path: string;
}, {}> {
    parentID: string;
    oldNodeData: MapNodeL3;
    newLinkData: ChildEntry;
    Validate(): void;
    GetDBUpdates(): {};
}
