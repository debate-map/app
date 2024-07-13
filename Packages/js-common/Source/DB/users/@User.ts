import {AddSchema, DB, Field, MGLClass} from "mobx-graphlink";

// todo: make this have a length constraint as well
export const User_id = "^[a-zA-Z0-9]+$";
AddSchema("UserID", {pattern: "^[a-zA-Z0-9]+$"});

@MGLClass({table: "users"})
export class User {
	constructor(data?: Partial<User>) {
		Object.assign(this, data);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	displayName: string;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	photoURL?: string|n;

	// custom
	// ==========

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	joinDate: number;

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: "PermissionGroupSet"})
	permissionGroups: PermissionGroupSet;

	@DB((t, n)=>t.integer(n))
	@Field({type: "number"})
	edits = 0;

	@DB((t, n)=>t.bigInteger(n).nullable())
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