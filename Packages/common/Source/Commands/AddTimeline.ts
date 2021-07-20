import {Command, dbp, AssertValidate, GenerateUUID, CommandMeta, SimpleSchema, DBHelper} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Timeline} from "../DB/timelines/@Timeline.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>({}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddTimeline extends Command<{mapID: string, timeline: Timeline}, {id: string}> {
	timelineID: string;
	Validate() {
		const {mapID, timeline} = this.payload;
		this.timelineID = this.timelineID ?? GenerateUUID();
		timeline.mapID = mapID;
		timeline.createdAt = Date.now();
		this.returnData = {id: this.timelineID};
		AssertValidate("Timeline", timeline, "Timeline invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {mapID, timeline} = this.payload;
		db.set(dbp`timelines/${this.timelineID}`, timeline);
		db.set(dbp`maps/${mapID}/.timelines/.${this.timelineID}`, true);
	}
}