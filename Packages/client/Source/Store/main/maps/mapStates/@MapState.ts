import {O} from "web-vcore";
import {CreateStringEnum} from "web-vcore/nm/js-vextensions";

export enum SortType {
	creatorID = "creatorID",
	creationDate = "creationDate",
	//updateDate: 1,
	//viewerCount: 1,
}
export enum TimelineSubpanel {
	collection = "collection",
	editor = "editor",
	playing = "playing",
}

export enum ShowChangesSinceType {
	none = "none",
	sinceVisitX = "sinceVisitX",
	allUnseenChanges = "allUnseenChanges",
}

export class MapState {
	@O initDone = false;

	@O list_sortBy = SortType.creationDate;
	@O list_filter = "";
	@O list_page = 0;

	@O list_selectedNodeID = null as string;
	@O list_selectedNode_openPanel = null as string;

	@O timelinePanelOpen = false;
	@O timelineOpenSubpanel = TimelineSubpanel.collection;
	@O showTimelineDetails = false;
	@O selectedTimeline = null as string;

	@O showChangesSince_type = ShowChangesSinceType.sinceVisitX;
	@O showChangesSince_visitOffset = 1;

	@O playingTimeline_time: number;
	@O playingTimeline_step: number; // step currently scrolled to
	@O playingTimeline_appliedStep: number; // max step scrolled to
}