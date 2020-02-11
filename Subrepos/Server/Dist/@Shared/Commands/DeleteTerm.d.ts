import { Command } from "mobx-firelink";
import { Term } from "../Store/firebase/terms/@Term";
export declare class DeleteTerm extends Command<{
    termID: string;
}, {}> {
    oldData: Term;
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: any;
    };
}
