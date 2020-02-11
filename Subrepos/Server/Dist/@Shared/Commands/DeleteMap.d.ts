import { Command } from "mobx-firelink";
import { UserMapInfoSet } from "../Store/firebase/userMapInfo/@UserMapInfo";
import { DeleteNode } from "./DeleteNode";
import { Map } from "../Store/firebase/maps/@Map";
export declare class DeleteMap extends Command<{
    mapID: string;
}, {}> {
    oldData: Map;
    userMapInfoSets: UserMapInfoSet[];
    sub_deleteNode: DeleteNode;
    Validate(): void;
    GetDBUpdates(): {};
}
