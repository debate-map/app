import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink";

@MGLClass({table: "nodeParentChildLinks"})
export class NodeParentChildLink {
	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`{v}nodes`).DeferRef())
	@Field({type: "string"})
	parent: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`{v}nodes`).DeferRef())
	@Field({type: "string"})
	child: string;

	@DB((t,n)=>t.integer(n))
	@Field({type: "number"})
	slot: number;
}