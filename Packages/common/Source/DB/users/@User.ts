import {AddSchema, DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";

// todo: make this have a length constraint as well
export const User_id = "^[a-zA-Z0-9]+$";
AddSchema("UserID", {pattern: "^[a-zA-Z0-9]+$"});

@MGLClass({table: "users"})
export class User {
	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	displayName: string;

	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	photoURL: string;

	// custom
	// ==========

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"})
	joinDate: number;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: "PermissionGroupSet"})
	permissionGroups: PermissionGroupSet;

	@DB((t,n)=>t.integer(n))
	@Field({type: "number"})
	edits: number;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"})
	lastEditAt: number;
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