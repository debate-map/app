import {AddSchema, Field, MGLClass} from "mobx-graphlink";

// todo: make this have a length constraint as well
export const User_id = "^[a-zA-Z0-9]+$";
AddSchema("UserID", {pattern: "^[a-zA-Z0-9]+$"});

@MGLClass({table: "users"})
export class User {
	constructor(data?: Partial<User>) {
		Object.assign(this, data);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	displayName: string;

	@Field({type: "string"}, {opt: true})
	photoURL?: string|n;

	// custom
	// ==========

	@Field({type: "number"}, {opt: true})
	joinDate: number;

	@Field({$ref: "PermissionGroupSet"})
	permissionGroups: PermissionGroupSet;

	@Field({type: "number"})
	edits = 0;

	@Field({type: "number"}, {opt: true})
	lastEditAt?: number|n;
}

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