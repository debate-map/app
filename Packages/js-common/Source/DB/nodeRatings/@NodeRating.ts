import {CE} from "js-vextensions";
import {DB, MGLClass, Field, PartialBy} from "mobx-graphlink";
import {NodeRatingType} from "./@NodeRatingType.js";

@MGLClass({table: "nodeRatings"})
export class NodeRating {
	constructor(initialData: Partial<NodeRating> & Pick<NodeRating, "node" | "type" | "value">) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	node: string;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "NodeRatingType"})
	type: NodeRatingType;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@DB((t, n)=>t.float(n))
	@Field({type: "number"})
	value: number; // range: 0-100

	@DB((t, n)=>t.specificType(n, "text[]"))
	@Field({items: {type: "string"}})
	c_accessPolicyTargets: string[]; // format is: `${policyId}:${apTable}`
}
export type NodeRating_MaybePseudo = PartialBy<NodeRating, "id" | "accessPolicy">;