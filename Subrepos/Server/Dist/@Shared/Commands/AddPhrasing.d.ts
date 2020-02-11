import { Command } from "mobx-firelink";
import { MapNodePhrasing } from "../Store/firebase/nodePhrasings/@MapNodePhrasing";
export declare class AddPhrasing extends Command<{
    phrasing: MapNodePhrasing;
}, string> {
    id: string;
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: MapNodePhrasing;
    };
}
