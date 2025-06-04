import {CE} from "js-vextensions";
import {MGLClass, Field, PartialBy} from "mobx-graphlink";
import {NodeRatingType} from "./@NodeRatingType.js";

@MGLClass({table: "nodeRatings"})
export class NodeRating {
	constructor(initialData: Partial<NodeRating> & Pick<NodeRating, "node" | "type" | "value">) {
		CE(this).VSet(initialData);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	accessPolicy: string;

	@Field({type: "string"})
	node: string;

	@Field({$ref: "NodeRatingType"})
	type: NodeRatingType;

	@Field({type: "string"}, {opt: true})
	creator: string;

	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@Field({type: "number"})
	value: number; // range: 0-100

	@Field({items: {type: "string"}})
	c_accessPolicyTargets: string[]; // format is: `${policyId}:${apTable}`
}
export type NodeRating_MaybePseudo = PartialBy<NodeRating, "id" | "accessPolicy" | "c_accessPolicyTargets">;