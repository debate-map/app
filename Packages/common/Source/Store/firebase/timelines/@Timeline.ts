import {AddSchema} from "../../../../Commands/node_modules/mobx-firelink";
import {CE} from "../../../../Commands/node_modules/js-vextensions";

export class Timeline {
	constructor(initialData: {name: string, creator: string} & Partial<Timeline>) {
		CE(this).VSet(initialData);
	}

	_key: string;
	creator: string; // probably todo: rename to creatorID
	createdAt: number;

	mapID: string;
	name: string;

	videoID: string;
	videoStartTime: number;
	videoHeightVSWidthPercent: number;

	steps: string[];
}
AddSchema("Timeline", {
	properties: {
		creator: {type: "string"},
		createdAt: {type: "number"},
		
		mapID: {type: "string"},
		name: {type: "string"},

		videoID: {type: ["string", "null"]},
		videoStartTime: {type: ["number", "null"]},
		videoHeightVSWidthPercent: {type: "number"},

		steps: {items: {type: "string"}},
	},
	required: ["mapID", "name", "creator", "createdAt"],
});