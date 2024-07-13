import {O} from "web-vcore";
import {CreateStringEnum} from "js-vextensions";
import {makeObservable} from "mobx";

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
	constructor() { makeObservable(this); }

	@O initDone = false;

	@O list_sortBy = SortType.creationDate;
	@O list_filter = "";
	@O list_page = 0;

	@O list_selectedNodeID: string|n;
	@O list_selectedNode_openPanel: string|n;

	@O timelinePanelOpen = false;
	@O timelineEditMode = false;
	@O timelinePlayback = false;
	@O showTimelineDetails = false;

	@O subscriptionPaintMode = false;

	@O selectedTimeline: string|n;

	@O zoomLevel = 1;

	@O showChangesSince_type = ShowChangesSinceType.sinceVisitX;
	@O showChangesSince_visitOffset = 1;

	/** Current time of active timeline's playback, in seconds. */
	@O playingTimeline_time: number|n;
	/** Step currently scrolled to, ie. the step to the right of the right-arrow in timeline-player ui. */
	@O playingTimeline_step: number|n;
	/** At the moment, this is always the same as playingTimeline_step. (only differs when using timeline-player floating panel with extra buttons; in that case, it's basically the "max step scrolled to" during session) */
	//@O playingTimeline_appliedStep: number|n;
}