import {GetValues_ForSchema} from "../../../Frame/General/Enums";

export class TimelineStep {
	constructor(initialData: Partial<TimelineStep>) {
		this.Extend(initialData);
	}

	_id: number;
	timelineID: number;
	title: string;
	actions: TimelineStepAction[];
}
AddSchema({
	properties: {
		timelineID: {type: "number"},
		title: {type: "string"},
		actions: {items: {$ref: "TimelineStepAction"}}
	},
	required: ["timelineID"],
}, "TimelineStep");

export enum TimelineStepActionType {
	ShowMessage = 10,
	ShowComment = 20,
	ShowNode = 30,
}
AddSchema({oneOf: GetValues_ForSchema(TimelineStepActionType)}, "TimelineStepActionType");

export class TimelineStepAction {
	constructor(initialData: Partial<TimelineStepAction>) {
		this.Extend(initialData);
	}

	_id: number;
	type = TimelineStepActionType.ShowComment;

	// for ShowMessage
	showMessage_message: string;

	// for ShowComment
	showComment_commentAuthor: string;
	showComment_commentText: string;
	
	// for ShowNode
	showNode_nodeID: number;
}
AddSchema({
	properties: {
		type: {$ref: "TimelineStepActionType"},

		showMessage_message: {type: "string"},

		showComment_commentAuthor: {type: "string"},
		showComment_commentText: {type: "string"},

		showNode_nodeID: {type: "number"},
	},
	required: ["type"],
}, "TimelineStepAction");