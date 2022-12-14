/*import {CE} from "web-vcore/nm/js-vextensions.js";
import {AV, Command} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {GetTimeline} from "../DB/timelines.js";
import {GetTimelineStep} from "../DB/timelineSteps.js";
import {TimelineStep} from "../DB/timelineSteps/@TimelineStep.js";
import {AssertUserCanDelete} from "./Helpers/SharedAsserts.js";

@UserEdit
export class DeleteTimelineStep extends Command<{stepID: string}, {}> {
	oldData: TimelineStep;
	timeline_oldSteps: string[];
	Validate() {
		const {stepID} = this.payload;
		this.oldData = AV.NonNull = GetTimelineStep(stepID);
		const timeline = AV.NonNull = GetTimeline(this.oldData.timelineID);
		AssertUserCanDelete(this, {creator: timeline.creator});
		this.timeline_oldSteps = timeline.steps;
	}

	DeclareDBUpdates(db: DBHelper) {
		const {stepID} = this.payload;
		db.set(dbp`timelines/${this.oldData.timelineID}/.steps`, CE(this.timeline_oldSteps).Except(stepID));
		db.set(dbp`timelineSteps/${stepID}`, null);
	}
}*/