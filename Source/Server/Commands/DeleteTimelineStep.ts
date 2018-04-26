import { UserEdit } from "Server/CommandMacros";
import { TimelineStep } from "Store/firebase/timelineSteps/@TimelineStep";
import { GetAsync_Raw } from "../../Frame/Database/DatabaseHelpers";
import { GetTimeline, GetTimelineStep } from "../../Store/firebase/timelines";
import { Command } from "../Command";

@UserEdit
export default class DeleteTimelineStep extends Command<{stepID: number}> {
	oldData: TimelineStep;
	timeline_oldSteps: number[];
	async Prepare() {
		let {stepID} = this.payload;
		this.oldData = await GetAsync_Raw(()=>GetTimelineStep(stepID));
		let timeline = await GetAsync_Raw(()=>GetTimeline(this.oldData.timelineID));
		this.timeline_oldSteps = timeline.steps;
	}
	async Validate() {}

	GetDBUpdates() {
		let {stepID} = this.payload;
		let updates = {};
		updates[`timelines/${this.oldData.timelineID}/steps`] = this.timeline_oldSteps.Except(stepID);
		updates[`timelineSteps/${stepID}`] = null;
		return updates;
	}
}