import { UserEdit } from "Server/CommandMacros";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { TimelineStep } from "../../Store/firebase/timelineSteps/@TimelineStep";
import { Command } from "../Command";

@UserEdit
export default class AddTimelineStep extends Command<{timelineID: number, step: TimelineStep}> {
	stepID: number;
	timeline_oldSteps: number[];
	async Prepare() {
		let {timelineID, step} = this.payload;

		let lastStepID = await GetDataAsync("general", "lastTimelineStepID") as number;
		this.stepID = lastStepID + 1;
		step.timelineID = timelineID;

		this.timeline_oldSteps = await GetDataAsync("timelines", timelineID, "steps") || [];
	}
	async Validate() {
		let {step} = this.payload;
		AssertValidate("TimelineStep", step, `TimelineStep invalid`);
	}
	
	GetDBUpdates() {
		let {timelineID, step} = this.payload;
		let updates = {
			// add step
			"general/lastTimelineStepID": this.stepID,
			[`timelineSteps/${this.stepID}`]: step,
			// add to timeline
			[`timelines/${timelineID}/steps`]: this.timeline_oldSteps.concat(this.stepID),
		} as any;
		return updates;
	}
}