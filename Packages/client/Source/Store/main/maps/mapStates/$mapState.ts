import {store} from "Store/index.js";
import {GetNode, GetTimeline, Timeline} from "dm_common";
import {FromJSON, GetValues} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {ShowChangesSinceType} from "./@MapState.js";

export const GetMapState = CreateAccessor({ctx: 1}, function(mapID: string|n) {
	return this.store.main.maps.mapStates.get(mapID!); // nn: get() actually accepts undefined
});

export const GetSelectedNodeID_InList = CreateAccessor({ctx: 1}, function(mapID: string) {
	return this.store.main.maps.mapStates.get(mapID)?.list_selectedNodeID;
});
export const GetSelectedNode_InList = CreateAccessor((mapID: string)=>{
	const nodeID = GetSelectedNodeID_InList(mapID);
	return GetNode(nodeID);
});

export const GetMap_List_SelectedNode_OpenPanel = CreateAccessor({ctx: 1}, function(mapID: string) {
	return this.store.main.maps.mapStates.get(mapID)?.list_selectedNode_openPanel;
});

export const GetTimelinePanelOpen = CreateAccessor({ctx: 1}, function(mapID: string): boolean {
	return this.store.main.maps.mapStates.get(mapID)?.timelinePanelOpen ?? false;
});
export const GetTimelineInEditMode = CreateAccessor({ctx: 1}, function(mapID: string) {
	return this.store.main.maps.mapStates.get(mapID)?.timelineEditMode;
});
export const GetShowTimelineDetails = CreateAccessor({ctx: 1}, function(mapID: string): boolean {
	return this.store.main.maps.mapStates.get(mapID)?.showTimelineDetails ?? false;
});

// timeline-related
// ==========

export const GetSelectedTimeline = CreateAccessor((mapID: string): Timeline|n=>{
	if (mapID == null) return null;
	const timelineID = GetMapState(mapID)?.selectedTimeline;
	return GetTimeline(timelineID);
});

export const GetNodeRevealHighlightTime = CreateAccessor({ctx: 1}, function() {
	return this.store.main.timelines.nodeRevealHighlightTime;
});

export const GetTimeFromWhichToShowChangedNodes = CreateAccessor((mapID: string|n)=>{
	if (mapID == null) return Number.MAX_SAFE_INTEGER; // if not in a map, don't calculate/show changes

	const type = store.main.maps.mapStates.get(mapID)?.showChangesSince_type;
	if (type == ShowChangesSinceType.none) return Number.MAX_SAFE_INTEGER; // from end of time (nothing)
	if (type == ShowChangesSinceType.allUnseenChanges) return 0; // from start of time (everything)
	if (PROD && !GetValues(ShowChangesSinceType).Contains(type)) return Number.MAX_SAFE_INTEGER; // defensive

	const visitOffset = store.main.maps.mapStates.get(mapID)?.showChangesSince_visitOffset ?? 1;
	const lastMapViewTimes = FromJSON(localStorage.getItem(`lastMapViewTimes_${mapID}`) || "[]") as number[];
	if (lastMapViewTimes.length == 0) return Number.MAX_SAFE_INTEGER; // our first visit, so don't show anything

	const timeOfSpecifiedVisit = lastMapViewTimes[visitOffset.KeepAtMost(lastMapViewTimes.length - 1)];
	return timeOfSpecifiedVisit;
});