import {TimelineStep} from "Store/firebase/timelineSteps/@TimelineStep";
import {AddSchema, AssertValidate, GetSchemaJSON, Schema} from "vwebapp-framework";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetTimelineStep} from "Store/firebase/timelineSteps";
import {UserEdit} from "../CommandMacros";

AddSchema("UpdateTimelineStep_payload", ["TimelineStep"], ()=>({
	properties: {
		stepID: {type: "string"},
		stepUpdates: Schema({
			properties: GetSchemaJSON("TimelineStep")["properties"].Including("title", "message", "groupID", "videoTime", "nodeReveals"),
		}),
	},
	required: ["stepID", "stepUpdates"],
}));

@UserEdit
export class UpdateTimelineStep extends Command<{stepID: string, stepUpdates: Partial<TimelineStep>}, {}> {
	oldData: TimelineStep;
	newData: TimelineStep;
	Validate() {
		AssertValidate("UpdateTimelineStep_payload", this.payload, "Payload invalid");

		const {stepID, stepUpdates} = this.payload;
		this.oldData = GetTimelineStep(stepID);
		AssertV(this.oldData, "oldData is null.");
		this.newData = {...this.oldData, ...stepUpdates};
		AssertValidate("TimelineStep", this.newData, "New timeline-step-data invalid");
	}

	GetDBUpdates() {
		const {stepID} = this.payload;
		const updates = {};
		updates[`timelineSteps/${stepID}`] = this.newData;
		return updates;
	}
}