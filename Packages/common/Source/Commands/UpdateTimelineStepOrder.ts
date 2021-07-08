/*import {CE} from "web-vcore/nm/js-vextensions.js";
import {Command} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {GetTimeline} from "../DB/timelines.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
export class UpdateTimelineStepOrder extends Command<{timelineID: string, stepID: string, newIndex: number}, {}> {
	timeline_oldSteps: string[];
	timeline_newSteps: string[];
	Validate() {
		const {timelineID, stepID, newIndex} = this.payload;
		const timeline = GetTimeline(timelineID);
		AssertUserCanModify(this, timeline);
		this.timeline_oldSteps = timeline.steps ?? [];
		this.timeline_newSteps = this.timeline_oldSteps.slice();
		CE(this.timeline_newSteps).Move(stepID, newIndex, false); // dnd system applies index-fixing itself, so don't apply here
	}

	DeclareDBUpdates(db) {
		const {timelineID} = this.payload;
		db.set(dbp`timelines/${timelineID}/.steps`, this.timeline_newSteps);
	}
}*/