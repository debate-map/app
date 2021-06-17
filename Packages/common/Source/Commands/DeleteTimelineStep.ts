import {CE} from "web-vcore/nm/js-vextensions";
import {AV, Command} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {GetTimeline} from "../Store/db/timelines";
import {GetTimelineStep} from "../Store/db/timelineSteps";
import {TimelineStep} from "../Store/db/timelineSteps/@TimelineStep";
import {AssertUserCanDelete} from "./Helpers/SharedAsserts";

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

	GetDBUpdates() {
		const {stepID} = this.payload;
		const updates = {};
		updates[`timelines/${this.oldData.timelineID}/.steps`] = CE(this.timeline_oldSteps).Except(stepID);
		updates[`timelineSteps/${stepID}`] = null;
		return updates;
	}
}