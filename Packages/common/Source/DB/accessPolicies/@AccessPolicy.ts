import {AddSchema, MGLClass, DB, Field, UUID_regex} from "web-vcore/nm/mobx-graphlink.js";

@MGLClass()
export class PermissionSet {
	@Field({type: "boolean"})
	access: boolean;

	@Field({type: "boolean"})
	addRevisions: boolean;

	// commented; users can always add "children" (however, governed maps can set a lens entry that hides unapproved children by default)
	/*@Field({type: "boolean"})
	addChildren: boolean;*/

	@Field({type: "boolean"})
	vote: boolean;

	@Field({type: "boolean"})
	delete: boolean;
}

@MGLClass({table: "accessPolicies"})
export class AccessPolicy {
	@DB((t, n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t, n)=>t.text(n).notNullable())
	@Field({type: "string"}, {req: true})
	name: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	base?: string|n;

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: PermissionSet.name})
	permissions_base: PermissionSet;

	@DB((t, n)=>t.jsonb(n))
	@Field({patternProperties: {[UUID_regex]: {$ref: PermissionSet.name}}})
	permissions_userExtends?: {[key: string]: PermissionSet}|n;
}