import { Command } from "mobx-firelink";
import { MapNodePhrasing } from "../Store/firebase/nodePhrasings/@MapNodePhrasing";
export declare class DeletePhrasing extends Command<{
    id: string;
}, {}> {
    oldData: MapNodePhrasing;
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: any;
    };
}
