import { Command } from "mobx-firelink";
import { MapNode } from "../Store/firebase/nodes/@MapNode";
import { MapNodeRevision } from "../Store/firebase/nodes/@MapNodeRevision";
import { AddNodeRevision } from "./AddNodeRevision";
/** Do not use this from client-side code. This is only to be used internally, by higher-level commands -- usually AddChildNode. */
export declare class AddNode extends Command<{
    mapID: string;
    node: MapNode;
    revision: MapNodeRevision;
}, {}> {
    sub_addRevision: AddNodeRevision;
    nodeID: string;
    parentID: string;
    parent_oldChildrenOrder: number[];
    Validate(): void;
    GetDBUpdates(): {};
}
