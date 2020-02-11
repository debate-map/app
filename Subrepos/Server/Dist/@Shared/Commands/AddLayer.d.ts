import { Command } from "mobx-firelink";
import { Layer } from "../Store/firebase/layers/@Layer";
export declare class AddLayer extends Command<{
    layer: Layer;
}, {}> {
    layerID: string;
    Validate(): void;
    GetDBUpdates(): any;
}
