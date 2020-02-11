import { AccessLevel } from "../nodes/@MapNode";
import { PermissionGroupSet } from "./@User";
export declare const GetUserPermissionGroups: ((userID: string) => PermissionGroupSet) & {
    Wait: (userID: string) => PermissionGroupSet;
};
export declare function GetUserAccessLevel(userID: string): AccessLevel;
export declare const CanGetBasicPermissions: ((userIDOrPermissions: string | PermissionGroupSet) => boolean) & {
    Wait: (userIDOrPermissions: string | PermissionGroupSet) => boolean;
};
export declare const HasBasicPermissions: ((userIDOrPermissions: string | PermissionGroupSet) => boolean) & {
    Wait: (userIDOrPermissions: string | PermissionGroupSet) => boolean;
};
export declare const HasModPermissions: ((userIDOrPermissions: string | PermissionGroupSet) => boolean) & {
    Wait: (userIDOrPermissions: string | PermissionGroupSet) => boolean;
};
export declare const HasAdminPermissions: ((userIDOrPermissions: string | PermissionGroupSet) => boolean) & {
    Wait: (userIDOrPermissions: string | PermissionGroupSet) => boolean;
};
/** If user is the creator, also requires that they (still) have basic permissions. */
export declare const IsUserCreatorOrMod: ((userID: string, entity: {
    creator?: string;
}) => boolean) & {
    Wait: (userID: string, entity: {
        creator?: string;
    }) => boolean;
};
export declare const CanEditNode: ((userID: string, nodeID: string) => boolean) & {
    Wait: (userID: string, nodeID: string) => boolean;
};
export declare const CanContributeToNode: ((userID: string, nodeID: string) => boolean) & {
    Wait: (userID: string, nodeID: string) => boolean;
};
