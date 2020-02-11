import { Command } from "mobx-firelink";
import { UUID } from "mobx-firelink";
import { AddChildNode } from "./AddChildNode";
import { Map } from "../Store/firebase/maps/@Map";
export declare class AddMap extends Command<{
    map: Map;
}, UUID> {
    mapID: string;
    sub_addNode: AddChildNode;
    Validate(): void;
    GetDBUpdates(): {};
}
