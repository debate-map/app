import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink";

export class PermissionSet {
	// todo
}
AddSchema("PermissionSet", {
	properties: {
		// todo
	},
});

@MGLClass({table: "accessPolicies"})
export class AccessPolicy {
	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	base: string;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: PermissionSet.name})
	permissions_base: PermissionSet;

	@DB((t,n)=>t.jsonb(n))
	@Field({$ref: PermissionSet.name})
	permissions_userExtends: PermissionSet;
}