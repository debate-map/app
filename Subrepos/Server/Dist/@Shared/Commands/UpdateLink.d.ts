import { Command } from "mobx-firelink";
import { ChildEntry } from "../Store/firebase/nodes/@MapNode";
export declare class UpdateLink extends Command<{
    linkParentID: string;
    linkChildID: string;
    linkUpdates: Partial<ChildEntry>;
}, {}> {
    newData: ChildEntry;
    Validate(): void;
    GetDBUpdates(): {};
}
