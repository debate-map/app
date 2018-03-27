import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {E} from "../../Frame/General/Others";
import {Term} from "../../Store/firebase/terms/@Term";
import AddNode from "./AddNode";
import {UserEdit} from "Server/CommandMacros";
import {Layer} from "Store/firebase/layers/@Layer";
import {Timeline} from "Store/firebase/timelines/@Timeline";

@UserEdit
export default class AddTimeline extends Command<{mapID: number, timeline: Timeline}> {
	timelineID: number;
	async Prepare() {
		let {mapID, timeline} = this.payload;

		let lastTimelineID = await GetDataAsync("general", "lastTimelineID") as number;
		this.timelineID = lastTimelineID + 1;
		timeline.mapID = mapID;
		timeline.createdAt = Date.now();

		this.returnData = this.timelineID;
	}
	async Validate() {
		let {timeline} = this.payload;
		AssertValidate("Timeline", timeline, `Timeline invalid`);
	}
	
	GetDBUpdates() {
		let {mapID, timeline} = this.payload;
		let updates = {
			"general/lastTimelineID": this.timelineID,
			[`timelines/${this.timelineID}`]: timeline,
			[`maps/${mapID}/timelines/${this.timelineID}`]: true,
		} as any;
		return updates;
	}
}