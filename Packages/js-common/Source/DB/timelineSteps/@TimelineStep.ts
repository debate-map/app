import {AddSchema, DB, Field, MGLClass} from "mobx-graphlink";
import {CE} from "js-vextensions";
import {MarkerForNonScalarField, PickOnly} from "../../Utils/General/General.js";
import {NodeEffect, TimelineStepEffect} from "./@TimelineStepEffect.js";

@MGLClass({table: "timelineSteps"})
export class TimelineStep {
	constructor(initialData: RequiredBy<Partial<TimelineStep>, "timelineID" | "orderKey" | "groupID" | "message">) {
		CE(this).VSet(initialData);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"})
	timelineID: string;

	@Field({type: "string"}) // should "{opt: true}" be added?
	orderKey: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"}, {opt: true})
	creator: string;

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

	/*@Field({items: {$ref: "NodeReveal"}, ...MarkerForNonScalarField()})
	nodeReveals: NodeReveal[];*/

	@DB((t, n)=>t.specificType(n, "text[]"))
	@Field({items: {type: "string"}})
	c_accessPolicyTargets: string[]; // format is: `${policyId}:${apTable}`

	@Field({$ref: "TimelineStep_Extras"})
	extras = new TimelineStep_Extras();
}

@MGLClass({}, {additionalProperties: true})
export class TimelineStep_Extras {
	constructor(data?: Partial<TimelineStep_Extras>) {
		Object.assign(this, data);
	}

	effects?: TimelineStepEffect[];
}