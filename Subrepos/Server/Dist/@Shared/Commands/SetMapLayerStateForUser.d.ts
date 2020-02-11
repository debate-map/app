import { Command } from "mobx-firelink";
export declare class SetMapLayerStateForUser extends Command<{
    userID: string;
    mapID: string;
    layerID: string;
    state: boolean;
}, {}> {
    Validate(): void;
    GetDBUpdates(): {};
}
