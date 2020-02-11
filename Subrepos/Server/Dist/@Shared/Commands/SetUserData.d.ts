import { Command } from "mobx-firelink";
import { User } from "../Store/firebase/users/@User";
declare type MainType = User;
export declare class SetUserData extends Command<{
    id: string;
    updates: Partial<MainType>;
}, {}> {
    oldData: MainType;
    newData: MainType;
    Validate(): void;
    GetDBUpdates(): {};
}
export {};
