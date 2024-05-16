import chroma from "web-vcore/nm/chroma-js.js";
import {AddSchema, DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";

@MGLClass({table: "subscriptions"})
export class Subscription {
	constructor(data?: Partial<Subscription>) {
		Object.assign(this, data);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	user: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	node: string;

	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"})
	addChildNode: boolean;

	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"})
	deleteNode: boolean;

	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"})
	addNodeLink: boolean;

    @DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"})
	deleteNodeLink: boolean;

    @DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"})
	addNodeRevision: boolean;

    @DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"})
	setNodeRating: boolean;

}