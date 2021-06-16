import {UserEdit} from "../CommandMacros";
import {Command_Old, GetAsync, Command, AssertV, AV} from "web-vcore/nm/mobx-graphlink";
import {TimelineStep} from "../Store/db/timelineSteps/@TimelineStep";
import {GetTimelineStep} from "../Store/db/timelineSteps";
import {GetTimeline} from "../Store/db/timelines";
import {CE} from "web-vcore/nm/js-vextensions";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteTimelineStep extends Command<{stepID: string}, {}> {
	oldData: TimelineStep;
	timeline_oldSteps: string[];
	Validate() {
		const {stepID} = this.payload;
		this.oldData = AV.NonNull = GetTimelineStep(stepID);
		const timeline = AV.NonNull = GetTimeline(this.oldData.timelineID);
		AssertExistsAndUserIsCreatorOrMod(this, {creator: timeline.creator}, "delete");
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