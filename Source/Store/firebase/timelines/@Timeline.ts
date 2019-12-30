import {AddSchema} from "vwebapp-framework";

export class Timeline {
	constructor(initialData: {name: string, creator: string} & Partial<Timeline>) {
		this.VSet(initialData);
	}

	_key: string;
	mapID: string;
	name: string;
	creator: string; // probably todo: rename to creatorID
	createdAt: number;

	videoID: string;
	videoStartTime: number;
	videoHeightVSWidthPercent: number;

	steps: string[];
}
AddSchema("Timeline", {
	properties: {
		mapID: {type: "string"},
		name: {type: "string"},
		creator: {type: "string"},
		createdAt: {type: "number"},

		videoID: {type: ["string", "null"]},
		videoStartTime: {type: ["number", "null"]},
		videoHeightVSWidthPercent: {type: "number"},

		steps: {items: {type: "string"}},
	},
	required: ["mapID", "name", "creator", "createdAt"],
});