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
	nodeID: number;
	revealDepth: number;
}
AddSchema({
	properties: {
		nodeID: {type: "number"},
		revealDepth: {type: "number"},
	},
	required: ["nodeID", "revealDepth"],
}, "NodeReveal");