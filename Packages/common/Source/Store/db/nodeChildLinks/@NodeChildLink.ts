import {CE} from "web-vcore/nm/js-vextensions";
import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink";
import {ClaimForm, Polarity} from "../nodes/@MapNode.js";

@MGLClass({table: "nodeChildLinks"})
export class NodeChildLink {
	constructor(data?: Partial<NodeChildLink>) {
		CE(this).VSet(data);
	}

	@DB((t,n)=>t.text(n).notNullable().primary())
	@Field({type: "string"}, {req: true})
	id: string;

	@DB((t,n)=>t.text(n).notNullable().references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"}, {req: true})
	parent: string;

	@DB((t,n)=>t.text(n).notNullable().references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"}, {req: true})
	child: string;

	@DB((t,n)=>t.integer(n))
	@Field({type: "number"})
	slot: number;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "ClaimForm"})
	form?: ClaimForm;

	@DB((t,n)=>t.boolean(n))
	@Field({type: "boolean"})
	seriesAnchor?: boolean;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "Polarity"})
	polarity?: Polarity;

	// runtime only
	//_mirrorLink?: boolean;
}