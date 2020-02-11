import { Command } from "mobx-firelink";
import { MapNodeTag } from "../Store/firebase/nodeTags/@MapNodeTag";
declare type MainType = MapNodeTag;
export declare class UpdateNodeTag extends Command<{
    id: string;
    updates: Partial<MainType>;
}> {
    oldData: MainType;
    newData: MainType;
    Validate(): void;
    GetDBUpdates(): {};
}
export {};
