import { GetAsync } from "Frame/Database/DatabaseHelpers";
import { UserEdit } from "Server/CommandMacros";
import { Timeline } from "Store/firebase/timelines/@Timeline";
import { GetTimeline } from "../../Store/firebase/timelines";
import { Command } from "../Command";

@UserEdit
export default class DeleteTimeline extends Command<{timelineID: number}> {
	oldData: Timeline;
	async Prepare() {
		let {timelineID} = this.payload;
		this.oldData = await GetAsync(()=>GetTimeline(timelineID))
	}
	async Validate() {
		if (this.oldData.steps) {
			throw new Error(`Cannot delete a timeline until all its steps have been deleted.`);
		}
	}

	GetDBUpdates() {
		let {timelineID} = this.payload;
		let updates = {};
		updates[`timelines/${timelineID}`] = null;
		updates[`maps/${this.oldData.mapID}/timelines/${timelineID}`] = null;
		return updates;
	}
}