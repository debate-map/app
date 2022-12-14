/*import {UserEdit} from "../CommandMacros.js";
import {GetAsync, Command, AssertV, AV} from "web-vcore/nm/mobx-graphlink.js";
import {Timeline} from "../DB/timelines/@Timeline.js";
import {GetTimeline} from "../DB/timelines.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
export class DeleteTimeline extends Command<{timelineID: string}, {}> {
	oldData: Timeline;
	Validate() {
		const {timelineID} = this.payload;
		this.oldData = AV.NonNull = GetTimeline(timelineID);
		AssertUserCanDelete(this, this.oldData);
		if (this.oldData.steps) {
			throw new Error("Cannot delete a timeline until all its steps have been deleted.");
		}
	}

	DeclareDBUpdates(db: DBHelper) {
		const {timelineID} = this.payload;
		db.set(dbp`timelines/${timelineID}`, null);
		db.set(dbp`maps/${this.oldData.mapID}/.timelines/.${timelineID}`, null);
	}
}*/