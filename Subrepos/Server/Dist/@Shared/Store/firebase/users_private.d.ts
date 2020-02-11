import { User_Private } from "./users_private/@User_Private";
export declare const GetUser_Private: ((userID: string) => User_Private) & {
    Wait: (userID: string) => User_Private;
};
