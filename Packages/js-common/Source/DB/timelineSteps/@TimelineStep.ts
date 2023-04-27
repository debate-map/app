import {AddSchema, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";

@MGLClass({table: "timelineSteps"})
export class TimelineStep {
	constructor(initialData: Partial<TimelineStep>) {
		CE(this).VSet(initialData);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	timelineID: string;

	@Field({type: "string"}) // should "{opt: true}" be added?
	orderKey: string;

	/*@Field({type: "string"})
	title: string;*/

	@Field({type: "string"})
	groupID: string;

	@Field({type: "number"}, {opt: true})
	timeFromStart?: number|n;

	@Field({type: "number"}, {opt: true})
	timeFromLastStep?: number|n;

	@Field({type: "string"})
	message: string;

	@Field({items: {$ref: "NodeReveal"}})
	nodeReveals: NodeReveal[];
}

export class NodeReveal {
	path: string;

	show: boolean;
	show_revealDepth: number;
	hide: boolean;
}
AddSchema("NodeReveal", {
	properties: {
		path: {type: "string"},

		show: {type: "boolean"},
		show_revealDepth: {type: "number"},
		hide: {type: "boolean"},
	},
	required: ["path"],
});