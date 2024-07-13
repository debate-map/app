import {CE} from "js-vextensions";
import {AddSchema, MGLClass, DB, Field, UUID_regex, DeriveJSONSchema, GetSchemaJSON} from "mobx-graphlink";
import {MarkerForNonScalarField} from "../../Utils/General/General.js";
import {APTable, PermissionSet, PermissionSetForType, PermitCriteria} from "./@PermissionSet.js";

/** See "Docs/AccessPolicies.md" for more info. */
@MGLClass({table: "accessPolicies"})
export class AccessPolicy {
	constructor(data: {name: string} & Partial<AccessPolicy>) {
		Object.assign(this, data);
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
	@Field({$ref: PermissionSet.name, ...MarkerForNonScalarField()})
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
		//...MarkerForNonScalarField(),
	})
	permissions_userExtends: {[key: string]: PermissionSet} = {};

	/*#* Derivation of permissions_userExtends, where each field that is undefined, is replaced with the value from the base-policy. (if one exists; else, false is used) */
	/*@DB((t, n)=>t.jsonb(n))
	@Field({
		$gqlType: "JSON", // graphql doesn't support key-value-pair structures, so just mark as JSON
		patternProperties: {[UUID_regex]: {$ref: "PermissionSet_Resolved"}},
	}, {opt: true})
	c_permissions_userExtends_final: {[key: string]: PermissionSet_Resolved};*/

	static PermissionExtendsForUserAndTable(self: AccessPolicy, userID: string|n, table: APTable) {
		if (userID == null) return null;
		const permission_set_for_user = self.permissions_userExtends[userID];
		if (permission_set_for_user == null) return null;
		const permission_set_for_type = permission_set_for_user[table];
		return permission_set_for_type;
	}
}