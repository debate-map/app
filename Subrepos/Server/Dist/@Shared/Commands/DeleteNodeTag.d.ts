import { Command } from "mobx-firelink";
import { MapNodeTag } from "../Store/firebase/nodeTags/@MapNodeTag";
export declare class DeleteNodeTag extends Command<{
    id: string;
}, {}> {
    oldData: MapNodeTag;
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: any;
    };
}
