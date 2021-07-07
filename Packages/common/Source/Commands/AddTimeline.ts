import {Command, dbp, AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";

import {UserEdit} from "../CommandMacros.js";
import {Timeline} from "../DB/timelines/@Timeline.js";

@UserEdit
export class AddTimeline extends Command<{mapID: string, timeline: Timeline}, string> {
	timelineID: string;
	Validate() {
		const {mapID, timeline} = this.payload;
		this.timelineID = this.timelineID ?? GenerateUUID();
		timeline.mapID = mapID;
		timeline.createdAt = Date.now();
		this.returnData = this.timelineID;
		AssertValidate("Timeline", timeline, "Timeline invalid");
	}

	GetDBUpdates() {
		const {mapID, timeline} = this.payload;
		const updates = {
			// 'general/data/.lastTimelineID': this.timelineID,
			[dbp`timelines/${this.timelineID}`]: timeline,
			[dbp`maps/${mapID}/.timelines/.${this.timelineID}`]: true,
		} as any;
		return updates;
	}
}