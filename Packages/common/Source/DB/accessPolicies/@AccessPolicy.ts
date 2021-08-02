import {CE} from "web-vcore/nm/js-vextensions";
import {AddSchema, MGLClass, DB, Field, UUID_regex, DeriveJSONSchema, GetSchemaJSON} from "web-vcore/nm/mobx-graphlink.js";

@MGLClass()
export class PermitCriteria {
	constructor(data?: Partial<PermitCriteria>) {
		this.VSet(data);
	}

	@Field({type: "number"})
	minApprovals = -1; // 0 = anyone, -1 = no-one

	@Field({type: "number"})
	minApprovalPercent = -1; // 0 = anyone, -1 = no-one
}

@MGLClass()
export class PermissionSetForType {
	constructor(data?: Partial<PermissionSetForType>) {
		this.VSet(data);
	}

	@Field({type: "boolean"})
	access = false; // true = anyone, false = no-one

	@Field({$ref: "PermitCriteria"})
	modify = new PermitCriteria();

	@Field({$ref: "PermitCriteria"})
	delete = new PermitCriteria();

	// for nodes only
	// ==========

	@Field({$ref: "PermitCriteria"})
	vote = new PermitCriteria();

	@Field({$ref: "PermitCriteria"})
	addPhrasing = new PermitCriteria();

	// commented; users can always add "children" (however, governed maps can set a lens entry that hides unapproved children by default)
	/*@Field({$ref: "PermitCriteria"}, {opt: true})
	addChild = new PermitCriteria();*/
}

@MGLClass()
export class PermissionSet {
	constructor(data?: Partial<PermissionSet>) {
		this.VSet(data);
	}

	@Field({$ref: "PermissionSetForType"})
	terms = new PermissionSetForType();

	@Field({$ref: "PermissionSetForType"})
	medias = new PermissionSetForType();

	@Field({$ref: "PermissionSetForType"})
	maps = new PermissionSetForType();

	@Field({$ref: "PermissionSetForType"})
	nodes = new PermissionSetForType();

	@Field({$ref: "PermissionSetForType"})
	nodeRatings = new PermissionSetForType();
}

/** See "Docs/AccessPolicies.md" for more info. */
@MGLClass({table: "accessPolicies"})
export class AccessPolicy {
	constructor(data: {name: string} & Partial<AccessPolicy>) {
		this.VSet(data);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	name: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	/*@DB((t, n)=>t.text(n).nullable().references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"}, {opt: true})
	base?: string|n;*/

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: PermissionSet.name})
	permissions = new PermissionSet({
		terms:			new PermissionSetForType({access: false, modify: new PermitCriteria(), delete: new PermitCriteria()}),
		medias:			new PermissionSetForType({access: false, modify: new PermitCriteria(), delete: new PermitCriteria()}),
		maps:				new PermissionSetForType({access: false, modify: new PermitCriteria(), delete: new PermitCriteria()}),
		nodes:			new PermissionSetForType({access: false, modify: new PermitCriteria(), delete: new PermitCriteria(), vote: new PermitCriteria(), addPhrasing: new PermitCriteria()}),
		nodeRatings:	new PermissionSetForType({access: false, modify: new PermitCriteria(), delete: new PermitCriteria()}),
	});

	/*#* Derivation of permissions, where each field that is undefined, is replaced with the value from the base-policy. (if one exists; else, false is used) */
	/*@DB((t, n)=>t.jsonb(n))
	@Field({$ref: "PermissionSet_Resolved"}, {opt: true})
	c_permissions_final: PermissionSet_Resolved;*/

	@DB((t, n)=>t.jsonb(n))
	@Field({
		$gqlType: "JSON", // graphql doesn't support key-value-pair structures, so just mark as JSON
		patternProperties: {[UUID_regex]: {$ref: PermissionSet.name}},
	})
	permissions_userExtends: {[key: string]: PermissionSet} = {};

	/*#* Derivation of permissions_userExtends, where each field that is undefined, is replaced with the value from the base-policy. (if one exists; else, false is used) */
	/*@DB((t, n)=>t.jsonb(n))
	@Field({
		$gqlType: "JSON", // graphql doesn't support key-value-pair structures, so just mark as JSON
		patternProperties: {[UUID_regex]: {$ref: "PermissionSet_Resolved"}},
	}, {opt: true})
	c_permissions_userExtends_final: {[key: string]: PermissionSet_Resolved};*/
}