import {CE} from "web-vcore/nm/js-vextensions.js";
import {DB, MGLClass, Field, PartialBy} from "web-vcore/nm/mobx-graphlink.js";
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
}
export type NodeRating_MaybePseudo = PartialBy<NodeRating, "id" | "accessPolicy">;