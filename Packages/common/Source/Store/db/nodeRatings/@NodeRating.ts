import {CE} from "web-vcore/nm/js-vextensions";
import {DB, MGLClass, Field} from "web-vcore/nm/mobx-graphlink";
import {NodeRatingType} from "./@NodeRatingType";

@MGLClass({table: "nodeRatings"})
export class NodeRating {
	constructor(initialData: Partial<NodeRating> & Pick<NodeRating, "node" | "type" | "user" | "value">) {
		CE(this).VSet(initialData);
	}

	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`{v}accessPolicies`).DeferRef())
	@Field({type: "string"})
	accessPolicy: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`{v}nodes`).DeferRef())
	@Field({type: "string"}, {req: true})
	node: string;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "NodeRatingType"}, {req: true})
	type: NodeRatingType;

	@DB((t,n)=>t.text(n).references("id").inTable(`{v}users`).DeferRef())
	@Field({type: "string"}, {req: true})
	user: string;

	@DB((t,n)=>t.bigInteger(n))
	@Field({type: "number"})
	editedAt: number;
	
	@DB((t,n)=>t.float(n))
	@Field({type: "number"}, {req: true})
	value: number;
}