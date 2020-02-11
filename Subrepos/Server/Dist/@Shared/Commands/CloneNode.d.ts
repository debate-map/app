import { Command } from "mobx-firelink";
import { AddChildNode } from "./AddChildNode";
import { LinkNode } from "./LinkNode";
export declare class CloneNode extends Command<{
    mapID: string;
    baseNodePath: string;
    newParentID: string;
}, {
    nodeID: string;
    revisionID: string;
}> {
    sub_addNode: AddChildNode;
    sub_linkChildren: LinkNode[];
    Validate(): void;
    GetDBUpdates(): {};
}
