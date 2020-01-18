import {UserEdit} from "Server/CommandMacros";
import {TimelineStep} from "Store/firebase/timelineSteps/@TimelineStep";
import {Command_Old, GetAsync, Command, AssertV, AV} from "mobx-firelink";
import {GetTimelineStep} from "Store/firebase/timelineSteps";
import {GetTimeline} from "Store/firebase/timelines";

@UserEdit
export class DeleteTimelineStep extends Command<{stepID: string}, {}> {
	oldData: TimelineStep;
	timeline_oldSteps: string[];
	Validate() {
		const {stepID} = this.payload;
		this.oldData = AV.NonNull = GetTimelineStep(stepID);
		const timeline = AV.NonNull = GetTimeline(this.oldData.timelineID);
		this.timeline_oldSteps = timeline.steps;
	}

	GetDBUpdates() {
		const {stepID} = this.payload;
		const updates = {};
		updates[`timelines/${this.oldData.timelineID}/.steps`] = this.timeline_oldSteps.Except(stepID);
		updates[`timelineSteps/${stepID}`] = null;
		return updates;
	}
}