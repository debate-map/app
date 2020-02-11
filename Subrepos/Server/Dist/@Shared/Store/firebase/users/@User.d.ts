export declare const User_id = "^[a-zA-Z0-9]+$";
export declare class User {
    _key?: string;
    displayName: string;
    photoURL: string;
    joinDate: number;
    permissionGroups: PermissionGroupSet;
    edits: number;
    lastEditAt: number;
}
export declare class PermissionGroupSet {
    basic: boolean;
    verified: boolean;
    mod: boolean;
    admin: boolean;
}
