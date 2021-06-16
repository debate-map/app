import {UserEdit} from "../CommandMacros";
import {Command_Old, GetAsync, Command, AssertV, AV} from "web-vcore/nm/mobx-graphlink";
import {Timeline} from "../Store/db/timelines/@Timeline";
import {GetTimeline} from "../Store/db/timelines";
import {AssertExistsAndUserIsCreatorOrMod} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteTimeline extends Command<{timelineID: string}, {}> {
	oldData: Timeline;
	Validate() {
		const {timelineID} = this.payload;
		this.oldData = AV.NonNull = GetTimeline(timelineID);
		AssertExistsAndUserIsCreatorOrMod(this, this.oldData, "delete");
		if (this.oldData.steps) {
			throw new Error("Cannot delete a timeline until all its steps have been deleted.");
		}
	}

	GetDBUpdates() {
		const {timelineID} = this.payload;
		const updates = {};
		updates[`timelines/${timelineID}`] = null;
		updates[`maps/${this.oldData.mapID}/.timelines/.${timelineID}`] = null;
		return updates;
	}
}