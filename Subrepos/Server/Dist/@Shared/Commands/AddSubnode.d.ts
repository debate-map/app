import { Command } from "mobx-firelink";
import { AddNode } from "./AddNode";
import { MapNode } from "../Store/firebase/nodes/@MapNode";
import { MapNodeRevision } from "../Store/firebase/nodes/@MapNodeRevision";
import { Layer } from "../Store/firebase/layers/@Layer";
export declare class AddSubnode extends Command<{
    mapID: string;
    layerID: string;
    anchorNodeID: string;
    subnode: MapNode;
    subnodeRevision: MapNodeRevision;
}, number> {
    sub_addNode: AddNode;
    layer_oldData: Layer;
    Validate(): void;
    GetDBUpdates(): {};
}
