import {AddSchema, AssertValidate, GetSchemaJSON, Schema, AV} from "web-vcore/nm/mobx-graphlink";
import {Command_Old, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {TimelineStep} from "../Store/firebase/timelineSteps/@TimelineStep";
import {GetTimelineStep} from "../Store/firebase/timelineSteps";
import {CE} from "web-vcore/nm/js-vextensions";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";
import {GetTimeline} from "../Commands";

AddSchema("UpdateTimelineStep_payload", ["TimelineStep"], ()=>({
	properties: {
		stepID: {type: "string"},
		stepUpdates: Schema({
			properties: CE(GetSchemaJSON("TimelineStep").properties).Including("title", "message", "groupID", "videoTime", "nodeReveals"),
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
		const timeline = AV.NonNull = GetTimeline(this.oldData.timelineID);
		AssertExistsAndUserIsCreatorOrMod(this, {creator: timeline.creator}, "update");
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