/*import {AddSchema, AssertValidate, GetSchemaJSON, Schema, AV} from "web-vcore/nm/mobx-graphlink.js";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {TimelineStep} from "../DB/timelineSteps/@TimelineStep.js";
import {GetTimelineStep} from "../DB/timelineSteps.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";
import {GetTimeline} from "..";

AddSchema("UpdateTimelineStep_payload", ["TimelineStep"], ()=>({
	properties: {
		stepID: {type: "string"},
		stepUpdates: Schema({
			properties: CE(GetSchemaJSON("TimelineStep").properties).IncludeKeys("title", "message", "groupID", "videoTime", "nodeReveals"),
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
		AssertUserCanModify(this, {creator: timeline.creator});
		this.newData = {...this.oldData, ...stepUpdates};
		AssertValidate("TimelineStep", this.newData, "New timeline-step-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {stepID} = this.payload;
		db.set(dbp`timelineSteps/${stepID}`, this.newData);
	}
}*/