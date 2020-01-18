import {UserEdit} from "Server/CommandMacros";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import {Command_Old, GetAsync, Command, AssertV, AV} from "mobx-firelink";
import {GetTimeline} from "../../Store/firebase/timelines";

@UserEdit
export class DeleteTimeline extends Command<{timelineID: string}, {}> {
	oldData: Timeline;
	Validate() {
		const {timelineID} = this.payload;
		this.oldData = AV.NonNull = GetTimeline(timelineID);
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