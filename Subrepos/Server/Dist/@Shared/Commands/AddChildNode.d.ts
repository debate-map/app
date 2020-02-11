import { Command } from "mobx-firelink";
import { AddNode } from "./AddNode";
import { MapNode, ChildEntry } from "../Store/firebase/nodes/@MapNode";
import { MapNodeRevision } from "../Store/firebase/nodes/@MapNodeRevision";
declare type Payload = {
    mapID: string;
    parentID: string;
    node: MapNode;
    revision: MapNodeRevision;
    link?: ChildEntry;
    asMapRoot?: boolean;
};
export declare class AddChildNode extends Command<Payload, {
    nodeID: string;
    revisionID: string;
}> {
    sub_addNode: AddNode;
    parent_oldData: MapNode;
    Validate(): void;
    GetDBUpdates(): {};
}
export {};
