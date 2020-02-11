import { AddSchema } from "mobx-firelink";
// todo: make this have a length constraint as well
export const User_id = "^[a-zA-Z0-9]+$";
AddSchema("UserID", { pattern: "^[a-zA-Z0-9]+$" });
export class User {
}
AddSchema("User", {
    properties: {
        displayName: { type: "string" },
        photoURL: { type: "string" },
        joinDate: { type: "number" },
        permissionGroups: { $ref: "PermissionGroupSet" },
        edits: { type: "number" },
        lastEditAt: { type: "number" },
    },
});
export class PermissionGroupSet {
}
AddSchema("PermissionGroupSet", {
    properties: {
        basic: { type: "boolean" },
        verified: { type: "boolean" },
        mod: { type: "boolean" },
        admin: { type: "boolean" },
    },
});
