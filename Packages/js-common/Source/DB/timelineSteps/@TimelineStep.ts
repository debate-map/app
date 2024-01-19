import {AddSchema, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {MarkerForNonScalarField, PickOnly} from "../../Utils/General/General.js";
import {TimelineStepEffect} from "./@TimelineStepEffect.js";

@MGLClass({table: "timelineSteps"})
export class TimelineStep {
	constructor(initialData: RequiredBy<Partial<TimelineStep>, "timelineID" | "orderKey" | "groupID" | "message" | "nodeReveals">) {
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

	@Field({type: "number"}, {opt: true})
	timeUntilNextStep?: number|n;

	@Field({type: "string"})
	message: string;

	@Field({items: {$ref: "NodeReveal"}, ...MarkerForNonScalarField()})
	nodeReveals: NodeReveal[];

	@Field({$ref: "TimelineStep_Extras"})
	extras = new TimelineStep_Extras();
}

@MGLClass()
export class NodeReveal {
	constructor(data?: RequiredBy<Partial<NodeReveal>, "path">) {
		Object.assign(this, data);
	}

	@Field({type: "string"})
	path: string;

	@Field({type: "boolean"}, {opt: true})
	show?: boolean|n;

	@Field({type: "number"}, {opt: true})
	show_revealDepth?: number|n;

	@Field({type: "number"}, {opt: true})
	changeFocusLevelTo?: number|n;

	@Field({type: "boolean"}, {opt: true})
	setExpandedTo?: boolean|n;

	@Field({type: "boolean"}, {opt: true})
	hide?: boolean|n;

	/*@Field({type: "number"}, {opt: true})
	hide_delay?: number|n;*/
}

@MGLClass()
export class TimelineStep_Extras {
	constructor(data?: Partial<TimelineStep_Extras>) {
		Object.assign(this, data);
	}

	effects?: TimelineStepEffect[];
}

export function IsNodeRevealEmpty(nodeReveal: NodeReveal) {
	return nodeReveal.show == null && nodeReveal.changeFocusLevelTo == null && nodeReveal.setExpandedTo == null && nodeReveal.hide == null;
}