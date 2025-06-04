import {CE, GetValues} from "js-vextensions";
import {AddSchema, MGLClass, Field} from "mobx-graphlink";
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

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({$ref: "UUID"}, {opt: true})
	creator: string;

	@Field({type: "number"}, {opt: true})
	createdAt: number;

	// access-policy is based on both the parent node and child node
	// * Link is accessible if either the parent or child is accessible

	@Field({type: "string"})
	parent: string;

	@Field({type: "string"}, {opt: true})
	child: string;

	@Field({$ref: "ChildGroup"})
	group: ChildGroup;

	@Field({type: "string"}) // should "{opt: true}" be added?
	orderKey: string;

	@Field({$ref: "ClaimForm"}, {opt: true})
	form?: ClaimForm|n;

	/** IIRC this marks the first claim within a child-group that is supposed to be "auto-numbered", eg. for sequences of math steps. */
	@Field({type: "boolean"}, {opt: true})
	seriesAnchor?: boolean;

	/** If true, the child's in a multi-premise arg, and the link-creator think the premise-series is complete. (ie. no additional premises needed) */
	@Field({type: "boolean"}, {opt: true})
	seriesEnd?: boolean;

	@Field({$ref: "Polarity"}, {opt: true})
	polarity?: Polarity|n;

	@Field({$ref: "NodeType"}, {opt: true})
	c_parentType?: NodeType; // derived from "nodes" table

	@Field({$ref: "NodeType"}, {opt: true})
	c_childType?: NodeType; // derived from "nodes" table

	@Field({items: {type: "string"}})
	c_accessPolicyTargets: string[]; // format is: `${policyId}:${apTable}`

	// runtime only
	declare _mirrorLink?: boolean;
}