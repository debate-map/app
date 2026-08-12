import {O} from "web-vcore";
import {CreateStringEnum} from "js-vextensions";

export enum SortType {
	creatorID = "creatorID",
	creationDate = "creationDate",
	//updateDate: 1,
	//viewerCount: 1,
}

export enum StepTab {
	none = "none",
	general = "general",
	audio = "audio",
}

export enum ShowChangesSinceType {
	none = "none",
	sinceVisitX = "sinceVisitX",
	allUnseenChanges = "allUnseenChanges",
}

export class MapState {
	@O accessor initDone = false;

	@O accessor list_sortBy = SortType.creationDate;
	@O accessor list_filter = "";
	@O accessor list_page = 0;

	@O accessor list_selectedNodeID: string|n;
	@O accessor list_selectedNode_openPanel: string|n;

	@O accessor timelinePanelOpen = false;
	@O accessor timelineEditMode = false;
	@O accessor timelinePlayback = false;
	@O accessor showTimelineDetails = false;

	@O accessor subscriptionPaintMode = false;

	@O accessor selectedTimeline: string|n;

	@O accessor zoomLevel = 1;

	@O accessor showChangesSince_type = ShowChangesSinceType.sinceVisitX;
	@O accessor showChangesSince_visitOffset = 1;

	/** Current time of active timeline's playback, in seconds. */
	@O accessor playingTimeline_time: number|n;
	/** Step currently scrolled to, ie. the step to the right of the right-arrow in timeline-player ui. */
	@O accessor playingTimeline_step: number|n;
	/** At the moment, this is always the same as playingTimeline_step. (only differs when using timeline-player floating panel with extra buttons; in that case, it's basically the "max step scrolled to" during session) */
	//@O accessor playingTimeline_appliedStep: number|n;
}