import {AddSchema} from "vwebapp-framework";

export class UserExtraInfo {
	constructor(initialData: Partial<UserExtraInfo>) {
		this.VSet(initialData);
	}
	joinDate: number;
	permissionGroups: PermissionGroupSet;

	edits: number;
	lastEditAt: number;
}
AddSchema("UserExtraInfo", {
	properties: {
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