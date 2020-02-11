import { Command } from "mobx-firelink";
import { ClaimForm, Polarity, MapNode } from "../Store/firebase/nodes/@MapNode";
export declare class LinkNode extends Command<{
    mapID: string;
    parentID: string;
    childID: string;
    childForm?: ClaimForm;
    childPolarity?: Polarity;
}, {}> {
    child_oldData: MapNode;
    parent_oldData: MapNode;
    Validate(): void;
    GetDBUpdates(): {};
}
