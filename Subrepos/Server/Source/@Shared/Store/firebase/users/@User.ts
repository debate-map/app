import {AddSchema} from "mobx-firelink";

// todo: make this have a length constraint as well
export const User_id = "^[a-zA-Z0-9]+$";
AddSchema("UserID", {pattern: "^[a-zA-Z0-9]+$"});
export class User {
	_key?: string;
	displayName: string;
	photoURL: string;

	// custom
	// ==========

	joinDate: number;
	permissionGroups: PermissionGroupSet;

	edits: number;
	lastEditAt: number;
}
AddSchema("User", {
	properties: {
		displayName: {type: "string"},
		photoURL: {type: "string"},

		joinDate: {type: "number"},
		permissionGroups: {$ref: "PermissionGroupSet"},
		edits: {type: "number"},
		lastEditAt: {type: "number"},
	},
});

export class PermissionGroupSet {
	basic: boolean;
	verified: boolean; // todo: probably remove
	mod: boolean;
	admin: boolean;
}
AddSchema("PermissionGroupSet", {
	properties: {
		basic: {type: "boolean"},
		verified: {type: "boolean"},
		mod: {type: "boolean"},
		admin: {type: "boolean"},
	},
});