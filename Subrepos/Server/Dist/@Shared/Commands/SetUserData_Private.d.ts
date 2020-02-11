import { Command } from "mobx-firelink";
import { User_Private } from "../Store/firebase/users_private/@User_Private";
declare type MainType = User_Private;
export declare class SetUserData_Private extends Command<{
    id: string;
    updates: Partial<MainType>;
}, {}> {
    oldData: MainType;
    newData: MainType;
    Validate(): void;
    GetDBUpdates(): {};
}
export {};
