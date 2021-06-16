import {UserEdit} from "../CommandMacros";
import {AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink";
import {Command_Old, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {TimelineStep} from "../Store/db/timelineSteps/@TimelineStep";
import {GetTimeline} from "../Store/db/timelines";
import {CE} from "web-vcore/nm/js-vextensions";

@UserEdit
export class AddTimelineStep extends Command<{timelineID: string, step: TimelineStep, stepIndex?: number}, {}> {
	stepID: string;
	timeline_oldSteps: string[];
	timeline_newSteps: string[];
	Validate() {
		const {timelineID, step, stepIndex} = this.payload;

		// const lastStepID = await GetDataAsync('general', 'data', '.lastTimelineStepID') as number;
		this.stepID = this.stepID ?? GenerateUUID();
		step.timelineID = timelineID;

		// this.timeline_oldSteps = await GetDocField_Async(a=>a.timelines.get(timelineID), a=>a.steps) || [];
		const timeline = GetTimeline(timelineID);
		AssertV(timeline, "timeline not yet loaded.");
		this.timeline_oldSteps = timeline?.steps || [];
		this.timeline_newSteps = this.timeline_oldSteps.slice();
		if (stepIndex) {
			CE(this.timeline_newSteps).Insert(stepIndex, this.stepID);
		} else {
			this.timeline_newSteps.push(this.stepID);
		}

		AssertValidate("TimelineStep", step, "TimelineStep invalid");
	}

	GetDBUpdates() {
		const {timelineID, step} = this.payload;
		const updates = {
			// add step
			// 'general/data/.lastTimelineStepID': this.stepID,
			[`timelineSteps/${this.stepID}`]: step,
			// add to timeline
			[`timelines/${timelineID}/.steps`]: this.timeline_newSteps,
		} as any;
		return updates;
	}
}