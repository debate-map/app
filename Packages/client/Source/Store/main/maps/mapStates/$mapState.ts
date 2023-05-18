import {emptyArray, FromJSON, GetValues, ToNumber, emptyArray_forLoading} from "web-vcore/nm/js-vextensions.js";
import {O} from "web-vcore";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetNode, GetPathsRevealedInSteps, GetMap, Timeline, GetPathRevealTimesInSteps, GetTimelineStep, GetTimelineSteps, GetTimeline, TimelineStep} from "dm_common";
import {store} from "Store/index.js";
import {TimelineSubpanel, ShowChangesSinceType} from "./@MapState.js";

export const GetMapState = CreateAccessor(function(mapID: string|n) {
	return this!.store.main.maps.mapStates.get(mapID!); // nn: get() actually accepts undefined
});

export const GetSelectedNodeID_InList = CreateAccessor(function(mapID: string) {
	return this!.store.main.maps.mapStates.get(mapID)?.list_selectedNodeID;
});
export const GetSelectedNode_InList = CreateAccessor((mapID: string)=>{
	const nodeID = GetSelectedNodeID_InList(mapID);
	return GetNode(nodeID);
});

export const GetMap_List_SelectedNode_OpenPanel = CreateAccessor(function(mapID: string) {
	return this!.store.main.maps.mapStates.get(mapID)?.list_selectedNode_openPanel;
});

export const GetTimelinePanelOpen = CreateAccessor(function(mapID: string): boolean {
	return this!.store.main.maps.mapStates.get(mapID)?.timelinePanelOpen ?? false;
});
export const GetTimelineOpenSubpanel = CreateAccessor(function(mapID: string) {
	return this!.store.main.maps.mapStates.get(mapID)?.timelineOpenSubpanel;
});
export const GetShowTimelineDetails = CreateAccessor(function(mapID: string): boolean {
	return this!.store.main.maps.mapStates.get(mapID)?.showTimelineDetails ?? false;
});

// timeline-related
// ==========

export const GetSelectedTimeline = CreateAccessor((mapID: string): Timeline|n=>{
	if (mapID == null) return null;
	const timelineID = GetMapState(mapID)?.selectedTimeline;
	return GetTimeline(timelineID);
});
export const GetPlayingTimeline = CreateAccessor((mapID: string): Timeline|n=>{
	if (mapID == null) return null;
	const mapState = GetMapState(mapID);
	if (mapState == null) return null;
	if (!mapState.timelinePanelOpen || mapState.timelineOpenSubpanel != TimelineSubpanel.playing) return null;
	const timelineID = mapState.selectedTimeline;
	return GetTimeline(timelineID);
});
/* export const GetPlayingTimelineTime = StoreAccessor((mapID: string): number => {
	if (mapID == null) return null;
	return State('main', 'maps', mapID, 'playingTimeline_time');
});*/
export const GetPlayingTimelineStepIndex = CreateAccessor((mapID: string): number|n=>{
	if (mapID == null) return null;
	return GetMapState(mapID)?.playingTimeline_step;
});
export const GetPlayingTimelineStep = CreateAccessor((mapID: string)=>{
	const playingTimeline = GetPlayingTimeline(mapID);
	if (playingTimeline == null) return null;
	const stepIndex = GetPlayingTimelineStepIndex(mapID) || 0;
	const steps = GetTimelineSteps(playingTimeline.id);
	const step = steps[stepIndex];
	return GetTimelineStep(step.id);
});
export const GetPlayingTimelineCurrentStepRevealNodes = CreateAccessor((mapID: string): string[]=>{
	const playingTimeline_currentStep = GetPlayingTimelineStep(mapID);
	if (playingTimeline_currentStep == null) return emptyArray;
	return GetPathsRevealedInSteps([playingTimeline_currentStep]);
});

export const GetPlayingTimelineRevealNodes_All = CreateAccessor((mapID: string): string[]=>{
	const map = GetMap(mapID);
	if (!map) return emptyArray;

	const playingTimeline = GetPlayingTimeline(mapID);
	const steps = playingTimeline ? GetTimelineSteps(playingTimeline.id) : emptyArray;
	return [`${map.rootNode}`].concat(GetPathsRevealedInSteps(steps));
});

export const GetPlayingTimelineAppliedStepIndex = CreateAccessor((mapID: string): number|n=>{
	if (mapID == null) return null;
	return GetMapState(mapID)?.playingTimeline_appliedStep;
});
export const GetPlayingTimelineAppliedSteps = CreateAccessor((mapID: string, excludeAfterCurrentStep = false): TimelineStep[]=>{
	const playingTimeline = GetPlayingTimeline(mapID);
	if (playingTimeline == null) return emptyArray;
	let stepIndex = GetPlayingTimelineAppliedStepIndex(mapID) ?? -1;
	if (excludeAfterCurrentStep) {
		const currentStep = GetPlayingTimelineStepIndex(mapID) ?? 0;
		stepIndex = Math.min(currentStep, stepIndex);
	}
	const steps = GetTimelineSteps(playingTimeline.id);
	return steps.slice(0, stepIndex + 1);
});
export const GetPlayingTimelineRevealPaths_UpToAppliedStep = CreateAccessor((mapID: string, excludeAfterCurrentStep = false): string[]=>{
	const map = GetMap(mapID);
	if (!map) return emptyArray;

	const appliedSteps = GetPlayingTimelineAppliedSteps(mapID, excludeAfterCurrentStep);
	return [`${map.rootNode}`].concat(GetPathsRevealedInSteps(appliedSteps));
});

export const GetNodeRevealHighlightTime = CreateAccessor(function() {
	return this!.store.main.timelines.nodeRevealHighlightTime;
});
export const GetTimeSinceNodeRevealedByPlayingTimeline = CreateAccessor((mapID: string, nodePath: string, timeSinceLastReveal = false, limitToJustPastHighlightRange = false): number|n=>{
	const appliedSteps = GetPlayingTimelineAppliedSteps(mapID, true);
	const nodeRevealTimes = GetPathRevealTimesInSteps(appliedSteps, timeSinceLastReveal);
	const nodeRevealTime = nodeRevealTimes[nodePath];
	if (nodeRevealTime == null) return null;

	// const timelineTime = GetPlayingTimelineTime(mapID);
	const mapState = GetMapState(mapID);
	if (mapState == null) return null;
	const timelineTime = mapState.playingTimeline_time ?? 0;
	let result = timelineTime - nodeRevealTime;
	if (limitToJustPastHighlightRange) {
		result = result.RoundTo(1); // round, to prevent unnecessary re-renders
		result = result.KeepBetween(0, GetNodeRevealHighlightTime() + 1); // cap to 0 through [highlight-time]+1, to prevent unneeded re-renders after X+1
	}
	return result;
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