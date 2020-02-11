import {UserEdit} from "../CommandMacros";
import {Command_Old, GetAsync, Command, AssertV, AV} from "mobx-firelink";
import {TimelineStep} from "../Store/firebase/timelineSteps/@TimelineStep";
import {GetTimelineStep} from "../Store/firebase/timelineSteps";
import {GetTimeline} from "../Store/firebase/timelines";
import {CE} from "js-vextensions";

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
		updates[`timelines/${this.oldData.timelineID}/.steps`] = CE(this.timeline_oldSteps).Except(stepID);
		updates[`timelineSteps/${stepID}`] = null;
		return updates;
	}
}