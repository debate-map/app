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
	
	// access-policy is based on both the parent node and child node
	// * Link is accessible if either the parent or child is accessible

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

	/** I forget what this is for. */
	@DB((t,n)=>t.boolean(n))
	@Field({type: "boolean"})
	seriesAnchor?: boolean;

	/** If true, the child's in a multi-premise arg, and the link-creator think the premise-series is complete. (ie. no additional premises needed) */
	@DB((t,n)=>t.boolean(n))
	@Field({type: "boolean"})
	seriesEnd?: boolean;

	@DB((t,n)=>t.text(n))
	@Field({$ref: "Polarity"})
	polarity?: Polarity;

	// runtime only
	//_mirrorLink?: boolean;
}