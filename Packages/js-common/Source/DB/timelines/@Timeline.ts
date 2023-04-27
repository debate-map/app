import {AddSchema, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";

@MGLClass({table: "timelines"})
export class Timeline {
	constructor(initialData: RequiredBy<Partial<Timeline>, "name" | "mapID" | "accessPolicy">) {
		CE(this).VSet(initialData);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@Field({type: "string"}, {opt: true})
	creator: string;

	@Field({type: "number"}, {opt: true})
	createdAt: number;

	@Field({type: "string"})
	accessPolicy: string;

	@Field({type: "string"})
	mapID: string;

	@Field({type: "string"})
	name: string;

	@Field({type: "string"}, {opt: true})
	videoID?: string|n;

	@Field({type: "number"}, {opt: true})
	videoStartTime?: number|n;

	@Field({type: "number"}, {opt: true})
	videoHeightVSWidthPercent?: number|n;
}