import {O} from "web-vcore";
import {CreateStringEnum} from "web-vcore/nm/js-vextensions";

export const [SortType] = CreateStringEnum({
	creatorID: 1,
	creationDate: 1,
	//updateDate: 1,
	//viewerCount: 1,
});
export type SortType = keyof typeof SortType;
export const [TimelineSubpanel] = CreateStringEnum({
	collection: 1,
	editor: 1,
	playing: 1,
});
export type TimelineSubpanel = keyof typeof TimelineSubpanel;

export const [ShowChangesSinceType] = CreateStringEnum({
	none: 1,
	sinceVisitX: 1,
	allUnseenChanges: 1,
});
export type ShowChangesSinceType = keyof typeof ShowChangesSinceType;

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