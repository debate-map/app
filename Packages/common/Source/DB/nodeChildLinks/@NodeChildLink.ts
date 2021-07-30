import {MapNodeType} from "DB/nodes/@MapNodeType.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink.js";
import {ClaimForm, Polarity} from "../nodes/@MapNode.js";

@MGLClass({table: "nodeChildLinks"})
export class NodeChildLink {
	constructor(data?: Partial<NodeChildLink>) {
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

	@DB((t, n)=>t.integer(n))
	@Field({type: "number"})
	slot: number;

	@DB((t, n)=>t.text(n).nullable())
	@Field({$ref: "ClaimForm"}, {opt: true})
	form?: ClaimForm|n;

	/** I forget what this is for. */
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
	@Field({$ref: "MapNodeType"}, {opt: true})
	c_parentType?: MapNodeType;

	@DB((t, n)=>t.text(n))
	@Field({$ref: "MapNodeType"}, {opt: true})
	c_childType?: MapNodeType;

	// runtime only
	declare _mirrorLink?: boolean;
}