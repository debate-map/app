/*import {UserEdit} from "../CommandMacros.js";
import {AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {TimelineStep} from "../DB/timelineSteps/@TimelineStep.js";
import {GetTimeline} from "../DB/timelines.js";
import {CE} from "web-vcore/nm/js-vextensions.js";

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

	DeclareDBUpdates(db) {
		const {timelineID, step} = this.payload;
		// add step
		db.set(dbp`timelineSteps/${this.stepID}`, step);
		// add to timeline
		db.set(dbp`timelines/${timelineID}/.steps`, this.timeline_newSteps);
	}
}*/