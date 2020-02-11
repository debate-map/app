import { Command } from "mobx-firelink";
import { MapNodePhrasing } from "../Store/firebase/nodePhrasings/@MapNodePhrasing";
declare type MainType = MapNodePhrasing;
export declare class UpdatePhrasing extends Command<{
    id: string;
    updates: Partial<MainType>;
}> {
    oldData: MainType;
    newData: MainType;
    Validate(): void;
    GetDBUpdates(): {};
}
export {};
