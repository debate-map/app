import { Command } from "mobx-firelink";
import { Layer } from "../Store/firebase/layers/@Layer";
import { UserMapInfoSet } from "../Store/firebase/userMapInfo/@UserMapInfo";
export declare class DeleteLayer extends Command<{
    layerID: string;
}, {}> {
    oldData: Layer;
    userMapInfoSets: UserMapInfoSet[];
    Validate(): void;
    GetDBUpdates(): {};
}
