import {CE} from "web-vcore/nm/js-vextensions";
import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink";

@MGLClass({table: "nodeChildLinks"})
export class NodeChildLink {
	constructor(data?: Partial<NodeChildLink>) {
		CE(this).VSet(data);
	}

	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	parent: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	child: string;

	@DB((t,n)=>t.integer(n))
	@Field({type: "number"})
	slot: number;
}