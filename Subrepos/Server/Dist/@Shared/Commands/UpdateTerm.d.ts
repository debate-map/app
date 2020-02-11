import { Command } from "mobx-firelink";
import { Term } from "../Store/firebase/terms/@Term";
export declare class UpdateTerm extends Command<{
    termID: string;
    updates: Partial<Term>;
}, {}> {
    oldData: Term;
    newData: Term;
    Validate(): void;
    GetDBUpdates(): any;
}
