import {UserEdit} from "../CommandMacros";
import {Command_Old, GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {CE} from "web-vcore/nm/js-vextensions";
import {GetTimeline} from "../Store/firebase/timelines";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

@UserEdit
export class UpdateTimelineStepOrder extends Command<{timelineID: string, stepID: string, newIndex: number}, {}> {
	timeline_oldSteps: string[];
	timeline_newSteps: string[];
	Validate() {
		const {timelineID, stepID, newIndex} = this.payload;
		const timeline = GetTimeline(timelineID);
		AssertExistsAndUserIsCreatorOrMod(this, timeline, "update");
		this.timeline_oldSteps = timeline.steps ?? [];
		this.timeline_newSteps = this.timeline_oldSteps.slice();
		CE(this.timeline_newSteps).Move(stepID, newIndex, false); // dnd system applies index-fixing itself, so don't apply here
	}

	GetDBUpdates() {
		const {timelineID} = this.payload;
		const updates = {
			[`timelines/${timelineID}/.steps`]: this.timeline_newSteps,
		} as any;
		return updates;
	}
}