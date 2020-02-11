import { MapNodeRevision } from "../Store/firebase/nodes/@MapNodeRevision";
import { Command } from "mobx-firelink";
import { ChildEntry, MapNode } from "../Store/firebase/nodes/@MapNode";
import { AddChildNode } from "./AddChildNode";
declare type Payload = {
    mapID: string;
    argumentParentID: string;
    argumentNode: MapNode;
    argumentRevision: MapNodeRevision;
    argumentLink?: ChildEntry;
    claimNode: MapNode;
    claimRevision: MapNodeRevision;
    claimLink?: ChildEntry;
};
export declare class AddArgumentAndClaim extends Command<Payload, {
    argumentNodeID: string;
    argumentRevisionID: string;
    claimNodeID: string;
    claimRevisionID: string;
}> {
    sub_addArgument: AddChildNode;
    sub_addClaim: AddChildNode;
    Validate(): void;
    GetDBUpdates(): {};
}
export {};
