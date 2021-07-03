import {CE} from "web-vcore/nm/js-vextensions.js";
import {DB, MGLClass, Field, PartialBy} from "web-vcore/nm/mobx-graphlink.js";
import {NodeRatingType} from "./@NodeRatingType.js";

@MGLClass({table: "nodeRatings"})
export class NodeRating {
	constructor(initialData: Partial<NodeRating> & Pick<NodeRating, "node" | "type" | "user" | "value">) {
		CE(this).VSet(initialData);
	}

	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"}, {req: true})
	node: string;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "NodeRatingType"}, {req: true})
	type: NodeRatingType;

	@DB((t,n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {req: true})
	user: string;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"})
	editedAt: number;
	
	@DB((t,n)=>t.float(n))
	@Field({type: "number"}, {req: true})
	value: number;
}
export type NodeRating_MaybePseudo = PartialBy<NodeRating, "id" | "accessPolicy">;