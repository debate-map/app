import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export class TimelineStep {
	constructor(initialData: Partial<TimelineStep>) {
		this.Extend(initialData);
	}

	_id: number;
	timelineID: number;
	title: string;
	message: string;
	nodeReveals: NodeReveal[];
}
AddSchema({
	properties: {
		timelineID: {type: "number"},
		title: {type: "string"},
		message: {type: "string"},
		nodeReveals: {$ref: "NodeReveal"},
	},
	required: ["timelineID"],
}, "TimelineStep");

export class NodeReveal {
	path: string;
	revealDepth: number;
}
AddSchema({
	properties: {
		path: {type: "string"},
		revealDepth: {type: "number"},
	},
	required: ["path", "revealDepth"],
}, "NodeReveal");