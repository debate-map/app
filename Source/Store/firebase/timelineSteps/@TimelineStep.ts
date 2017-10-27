import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export class TimelineStep {
	constructor(initialData: Partial<TimelineStep>) {
		this.Extend(initialData);
	}

	_id: number;
	timelineID: number;
	title: string;
	message: string;
	nodesToShowStr: string;
}
AddSchema({
	properties: {
		timelineID: {type: "number"},
		title: {type: "string"},
		message: {type: "string"},
		nodesToShowStr: {type: "string"},
	},
	required: ["timelineID"],
}, "TimelineStep");