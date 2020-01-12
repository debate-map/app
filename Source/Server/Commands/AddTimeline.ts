import {UserEdit} from "Server/CommandMacros";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import {Command_Old, Command} from "mobx-firelink";
import {AssertValidate, GenerateUUID} from "vwebapp-framework";

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
			[`timelines/${this.timelineID}`]: timeline,
			[`maps/${mapID}/.timelines/.${this.timelineID}`]: true,
		} as any;
		return updates;
	}
}