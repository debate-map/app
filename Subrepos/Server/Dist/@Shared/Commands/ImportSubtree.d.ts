import { Command } from "mobx-firelink";
import { Rating } from "../Store/firebase/nodeRatings/@Rating";
declare type SubtreeExportData_Old = any;
export declare class ImportSubtree extends Command<{
    mapID?: string;
    parentNodeID: string;
    subtreeJSON: string;
    nodesToLink?: {
        [key: string]: string;
    };
    importRatings: boolean;
    importRatings_userIDs?: string[];
}> {
    rootSubtreeData: SubtreeExportData_Old;
    subs: Command<any, any>[];
    subs_last: Command<any, any>[];
    Validate(): void;
    oldID_newID: {
        [key: number]: string;
    };
    ProcessSubtree(subtreeData: SubtreeExportData_Old, parentID: string): void;
    nodeRatingsToAdd: Rating[];
    GetDBUpdates(): {};
}
export {};
