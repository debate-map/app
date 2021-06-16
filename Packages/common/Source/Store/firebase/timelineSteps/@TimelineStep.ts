import {AddSchema} from "../../../../Commands/node_modules/mobx-firelink";
import {CE} from "../../../../Commands/node_modules/js-vextensions";

export class TimelineStep {
	constructor(initialData: Partial<TimelineStep>) {
		CE(this).VSet(initialData);
	}

	_key: string;
	timelineID: string;
	title: string;
	groupID: number;
	// if timeline has video
	videoTime: number;

	message: string;

	nodeReveals: NodeReveal[];
}
AddSchema("TimelineStep", {
	properties: {
		timelineID: {type: "string"},
		title: {type: "string"},
		groupID: {type: ["number", "null"]},
		videoTime: {type: ["number", "null"]},

		message: {type: "string"},

		nodeReveals: {$ref: "NodeReveal"},
	},
	required: ["timelineID"],
});

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