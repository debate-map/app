import { Command } from "mobx-firelink";
import { MapNodeTag } from "../Store/firebase/nodeTags/@MapNodeTag";
export declare class AddNodeTag extends Command<{
    tag: MapNodeTag;
}, string> {
    id: string;
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: MapNodeTag;
    };
}
