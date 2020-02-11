import { Command } from "mobx-firelink";
import { Map } from "../Store/firebase/maps/@Map";
export declare class SetLayerAttachedToMap extends Command<{
    mapID: string;
    layerID: string;
    attached: boolean;
}, {}> {
    Validate_Early(): void;
    oldData: Map;
    Validate(): void;
    GetDBUpdates(): {};
}
