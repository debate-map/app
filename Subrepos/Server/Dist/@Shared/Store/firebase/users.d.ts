import { User } from "./users/@User";
export declare const MeID: (() => string) & {
    Wait: () => string;
};
export declare const Me: (() => User) & {
    Wait: () => User;
};
export declare const GetUser: ((userID: string) => User) & {
    Wait: (userID: string) => User;
};
export declare const GetUsers: (() => User[]) & {
    Wait: () => User[];
};
