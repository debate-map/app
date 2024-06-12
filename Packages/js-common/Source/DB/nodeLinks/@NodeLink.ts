import {CE, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink.js";
import {NodeType} from "../nodes/@NodeType.js";

export enum ChildGroup {
	generic = "generic",
	truth = "truth",
	relevance = "relevance",
	comment = "comment",
	// testing
	neutrality = "neutrality",
	freeform = "freeform",
}
AddSchema("ChildGroup", {enum: GetValues(ChildGroup)});

export const childGroupsWithPolarity_required = [ChildGroup.truth, ChildGroup.relevance, ChildGroup.neutrality];
export const childGroupsWithPolarity_requiredOrOptional = [ChildGroup.truth, ChildGroup.relevance, ChildGroup.neutrality, ChildGroup.freeform];

export enum ClaimForm {
	base = "base",
	negation = "negation",
	question = "question",
	//narrative = "narrative", // commented, because the narrative-form is never displayed in the debate-map tree itself atm (instead used for, eg. the papers app)
}
//export type ClaimForm = typeof ClaimForm_values[number];
AddSchema("ClaimForm", {enum: GetValues(ClaimForm)});

/*export enum Polarity {
	Supporting = 10,
	Opposing = 20,
}
AddSchema("Polarity", {enum: GetValues(Polarity)});*/
/*export const Polarity_values = ["supporting", "opposing"] as const;
export type Polarity = typeof Polarity_values[number];
AddSchema("Polarity", {oneOf: Polarity_values});*/

export enum Polarity {
	supporting = "supporting",
	opposing = "opposing",
}
//export type Polarity = typeof Polarity_values[number];
AddSchema("Polarity", {enum: GetValues(Polarity)});

@MGLClass({table: "nodeLinks"})
export class NodeLink {
	constructor(data?: Partial<NodeLink>) {
		CE(this).VSet(data);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({$ref: "UUID"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	// access-policy is based on both the parent node and child node
	// * Link is accessible if either the parent or child is accessible

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	parent: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"}, {opt: true})
	child: string;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "ChildGroup"})
	group: ChildGroup;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"}) // should "{opt: true}" be added?
	orderKey: string;

	@DB((t, n)=>t.text(n).nullable())
	@Field({$ref: "ClaimForm"}, {opt: true})
	form?: ClaimForm|n;

	/** IIRC this marks the first claim within a child-group that is supposed to be "auto-numbered", eg. for sequences of math steps. */
	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"}, {opt: true})
	seriesAnchor?: boolean;

	/** If true, the child's in a multi-premise arg, and the link-creator think the premise-series is complete. (ie. no additional premises needed) */
	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"}, {opt: true})
	seriesEnd?: boolean;

	@DB((t, n)=>t.text(n).nullable())
	@Field({$ref: "Polarity"}, {opt: true})
	polarity?: Polarity|n;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "NodeType"}, {opt: true})
	c_parentType?: NodeType; // derived from "nodes" table

	@DB((t, n)=>t.text(n))
	@Field({$ref: "NodeType"}, {opt: true})
	c_childType?: NodeType; // derived from "nodes" table

	// runtime only
	declare _mirrorLink?: boolean;
}
