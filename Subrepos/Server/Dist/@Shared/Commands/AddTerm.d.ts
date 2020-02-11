import { Command } from "mobx-firelink";
import { Term } from "../Store/firebase/terms/@Term";
export declare class AddTerm extends Command<{
    term: Term;
}, string> {
    termID: string;
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: boolean | Term;
    };
}
