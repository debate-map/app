import { Command } from "mobx-firelink";
export declare class UnlinkNode extends Command<{
    mapID: string;
    parentID: string;
    childID: string;
}, {}> {
    allowOrphaning: boolean;
    parent_oldChildrenOrder: string[];
    Validate(): void;
    GetDBUpdates(): {};
}
