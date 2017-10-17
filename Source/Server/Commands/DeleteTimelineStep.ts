import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {IsArgumentNode} from "../../Store/firebase/nodes/$node";
import {Map} from "../../Store/firebase/maps/@Map";
import DeleteNode from "Server/Commands/DeleteNode";
import {UserEdit} from "Server/CommandMacros";
import {Subforum} from "../../Store/firebase/forum/@Subforum";
import {ShowMessageBox} from "../../Frame/UI/VMessageBox";
import {GetAsync} from "Frame/Database/DatabaseHelpers";
import {TimelineStep} from "Store/firebase/timelineSteps/@TimelineStep";
import {GetTimelineStep, GetTimeline} from "../../Store/firebase/timelines";

@UserEdit
export default class DeleteTimelineStep extends Command<{stepID: number}> {
	oldData: TimelineStep;
	timeline_oldSteps: number[];
	async Prepare() {
		let {stepID} = this.payload;
		this.oldData = await GetAsync(()=>GetTimelineStep(stepID));
		let timeline = await GetAsync(()=>GetTimeline(this.oldData.timelineID));
		this.timeline_oldSteps = timeline.steps;
	}
	async Validate() {}

	GetDBUpdates() {
		let {stepID} = this.payload;
		let updates = {};
		updates[`timelines/${this.oldData.timelineID}/steps`] = this.timeline_oldSteps.Except(stepID);
		updates[`timelineSteps/${stepID}`] = null;
		return updates;
	}
}