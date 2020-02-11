import { Command } from "mobx-firelink";
import { Map } from "../Store/firebase/maps/@Map";
declare type MainType = Map;
export declare class UpdateMapDetails extends Command<{
    id: string;
    updates: Partial<MainType>;
}, {}> {
    oldData: MainType;
    newData: MainType;
    Validate(): void;
    GetDBUpdates(): {};
}
export {};
