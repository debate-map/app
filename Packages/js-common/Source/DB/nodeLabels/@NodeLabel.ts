import {MGLClass, Field} from "mobx-graphlink";
import {CE} from "js-vextensions";

@MGLClass({table: "nodeLabels"})
export class NodeLabel {
	constructor(initialData: Partial<NodeLabel>) {
		CE(this).VSet(initialData);
	}

	@Field({type: "string"})
	id: string;

	@Field({type: "string"})
	nodeId: string;

	@Field({type: "string"})
	label: string;

	@Field({type: "number"})
	createdAt: number

	@Field({type: "string"})
	creator: string;
}
