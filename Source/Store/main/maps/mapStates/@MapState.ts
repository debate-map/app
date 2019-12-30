import {O} from "vwebapp-framework";

export enum SortType {
	CreatorID = 10,
	CreationDate = 20,
	// UpdateDate = 30,
	// ViewerCount = 40,
}
export enum TimelineSubpanel {
	Collection = 10,
	Editor = 20,
	Playing = 30,
}

export enum ShowChangesSinceType {
	None = 10,
	SinceVisitX = 20,
	AllUnseenChanges = 30,
}

export class MapState {
	@O initDone = false;

	@O list_sortBy = SortType.CreationDate;
	@O list_filter = "";
	@O list_page = 0;

	@O list_selectedNodeID = null as string;
	@O list_selectedNode_openPanel = null as string;

	@O timelinePanelOpen = false;
	@O timelineOpenSubpanel = TimelineSubpanel.Collection;
	@O showTimelineDetails = false;
	@O selectedTimeline = null as string;

	@O showChangesSince_type = ShowChangesSinceType.SinceVisitX;
	@O showChangesSince_visitOffset = 1;

	@O playingTimeline_time: number;
	@O playingTimeline_step: number; // step currently scrolled to
	@O playingTimeline_appliedStep: number; // max step scrolled to
}