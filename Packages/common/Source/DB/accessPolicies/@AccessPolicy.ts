import {CE} from "web-vcore/nm/js-vextensions";
import {AddSchema, MGLClass, DB, Field, UUID_regex} from "web-vcore/nm/mobx-graphlink.js";

@MGLClass()
export class PermissionSet {
	@Field({type: "boolean"}, {opt: true})
	access: boolean;

	@Field({type: "boolean"}, {opt: true})
	addRevisions: boolean;

	// commented; users can always add "children" (however, governed maps can set a lens entry that hides unapproved children by default)
	/*@Field({type: "boolean"}, {opt: true})
	addChildren: boolean;*/

	@Field({type: "boolean"}, {opt: true})
	vote: boolean;

	@Field({type: "boolean"}, {opt: true})
	delete: boolean;
}

/** See "Docs/AccessPolicies.md" for more info. */
@MGLClass({table: "accessPolicies"})
export class AccessPolicy {
	constructor(initialData: {name: string} & Partial<AccessPolicy>) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true}) // optional during creation
	id: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	name: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"})
	createdAt: number;

	@DB((t, n)=>t.text(n).nullable().references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"}, {opt: true})
	base?: string|n;

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: PermissionSet.name})
	permissions_base: PermissionSet;

	@DB((t, n)=>t.jsonb(n))
	@Field({patternProperties: {[UUID_regex]: {$ref: PermissionSet.name}}})
	permissions_userExtends: {[key: string]: PermissionSet};
}