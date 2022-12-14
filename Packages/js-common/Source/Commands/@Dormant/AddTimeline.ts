import {AssertValidate, Command, CommandMeta, DBHelper, dbp, GenerateUUID, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../../CommandMacros/UserEdit.js";
import {Timeline} from "../../DB/timelines/@Timeline.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$mapID: {$ref: "UUID"},
		$timeline: {$ref: Timeline.name},
	}),
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