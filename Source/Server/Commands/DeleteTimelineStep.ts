import {UserEdit} from "Server/CommandMacros";
import {TimelineStep} from "Store/firebase/timelineSteps/@TimelineStep";
import {Command_Old, GetAsync, Command, AssertV} from "mobx-firelink";
import {GetTimelineStep} from "Store/firebase/timelineSteps";
import {GetTimeline} from "Store/firebase/timelines";


@UserEdit
export class DeleteTimelineStep extends Command<{stepID: string}, {}> {
	oldData: TimelineStep;
	timeline_oldSteps: string[];
	Validate() {
		const {stepID} = this.payload;
		this.oldData = GetTimelineStep(stepID);
		AssertV(this.oldData, "oldData is null");
		const timeline = GetTimeline(this.oldData.timelineID);
		AssertV(timeline, "timeline is null.");
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