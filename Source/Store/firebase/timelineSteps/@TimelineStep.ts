import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export class TimelineStep {
	constructor(initialData: Partial<TimelineStep>) {
		this.Extend(initialData);
	}

	_id: number;
	timelineID: number;
	actions: TimelineStepAction[];
}
AddSchema({
	properties: {
		timelineID: {type: "number"},
		actions: {items: {$ref: "TimelineStepAction"}}
	},
	required: ["timelineID"],
}, "TimelineStep");

export enum TimelineStepActionType {
	ShowComment,
	ShowNode,
}
AddSchema({oneOf: GetValues_ForSchema(TimelineStepActionType)}, "TimelineStepActionType");

export class TimelineStepAction {
	constructor(initialData: {stepID: number} & Partial<TimelineStepAction>) {
		this.Extend(initialData);
	}

	_id: number;
	stepID: number;
	type = TimelineStepActionType.ShowComment;

	// for ShowComment
	showComment_commentAuthor: string;
	showComment_commentText: string;
	
	// for ShowNode
	showNode_nodeID: number;
}
AddSchema({
	properties: {
		stepID: {type: "number"},
		type: {$ref: "TimelineStepActionType"},

		showComment_commentAuthor: {type: "string"},
		showComment_commentText: {type: "string"},

		showNode_nodeID: {type: "number"},
	},
	required: ["stepID", "type"],
}, "TimelineStepAction");