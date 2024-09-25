import {Assert} from "js-vextensions";
import {MGLClass, Field} from "mobx-graphlink";
import {AssertUnreachable} from "web-vcore";
import {MarkerForNonScalarField} from "../../Utils/General/General.js";

@MGLClass()
export class PermissionSet {
	constructor(data?: Partial<PermissionSet>) {
		Object.assign(this, data);
	}

	@Field({$ref: "PermissionSetForType", ...MarkerForNonScalarField()})
	terms = new PermissionSetForType();

	@Field({$ref: "PermissionSetForType", ...MarkerForNonScalarField()})
	medias = new PermissionSetForType();

	@Field({$ref: "PermissionSetForType", ...MarkerForNonScalarField()})
	maps = new PermissionSetForType();

	@Field({$ref: "PermissionSetForType", ...MarkerForNonScalarField()})
	nodes = new PermissionSetForType();

	// most node-related rows use their node's access-policy as their own; node-ratings is an exception, because individual entries can be kept hidden without disrupting collaboration significantly
	@Field({$ref: "PermissionSetForType", ...MarkerForNonScalarField()})
	nodeRatings = new PermissionSetForType();

	@Field({$ref: "PermissionSetForType", ...MarkerForNonScalarField()})
	others = new PermissionSetForType();
}

@MGLClass()
export class PermissionSetForType {
	constructor(data?: Partial<PermissionSetForType>) {
		Object.assign(this, data);
	}

	@Field({type: "boolean"})
	access = false; // true = anyone, false = no-one

	@Field({$ref: "PermitCriteria", ...MarkerForNonScalarField()})
	modify = new PermitCriteria();

	@Field({$ref: "PermitCriteria", ...MarkerForNonScalarField()})
	delete = new PermitCriteria();

	// for nodes only
	// ==========

	// todo: probably replace with more fluid system (eg. where users can always "add children", but where governed maps can easily set a lens entry that hides unapproved children by default)
	@Field({$ref: "PermitCriteria", ...MarkerForNonScalarField()}, {opt: true})
	addChild? = new PermitCriteria();

	@Field({$ref: "PermitCriteria", ...MarkerForNonScalarField()}, {opt: true})
	addPhrasing? = new PermitCriteria();

	@Field({$ref: "PermitCriteria", ...MarkerForNonScalarField()}, {opt: true})
	vote? = new PermitCriteria();

	static AsBool(self: PermissionSetForType|n, action: APAction) {
		if (self == null) return null;
		if (action == APAction.access) { return self.access; }
		if (action == APAction.modify) { return self.modify.minApprovals != -1; }
		if (action == APAction.delete) { return self.modify.minApprovals != -1; }
		if (action == APAction.addChild) { return (self.addChild?.minApprovals ?? -1) != -1; }
		if (action == APAction.addPhrasing) { return (self.addPhrasing?.minApprovals ?? -1) != -1; }
		if (action == APAction.vote) { return (self.vote?.minApprovals ?? -1) != -1; }
		AssertUnreachable(action, `Invalid action: ${action}`);
	}
}

@MGLClass()
export class PermitCriteria {
	constructor(data?: Partial<PermitCriteria>) {
		Object.assign(this, data);
	}

	@Field({type: "number"})
	minApprovals = -1; // 0 = anyone, -1 = no-one

	@Field({type: "number"})
	minApprovalPercent = -1; // 0 = anyone, -1 = no-one
}

export enum APTable {
	maps = "maps",
	medias = "medias",
	terms = "terms",
	nodes = "nodes",
	nodeRatings = "nodeRatings",
	others = "others",
}
export enum APAction {
	access = "access",
	modify = "modify",
	delete = "delete",
	addChild = "addChild",
	addPhrasing = "addPhrasing",
	vote = "vote",
}