import {emptyArray, FromJSON, GetValues, ToNumber, emptyArray_forLoading} from "web-vcore/nm/js-vextensions";
import {O} from "web-vcore";
import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {GetNode, GetNodesRevealedInSteps, GetMap} from "dm_common";
import {TimelineSubpanel, ShowChangesSinceType} from "./@MapState";

export const GetMapState = StoreAccessor(s=>(mapID: string)=>{
	return s.main.maps.mapStates.get(mapID);
});

export const GetSelectedNodeID_InList = StoreAccessor(s=>(mapID: string)=>{
	return s.main.maps.mapStates.get(mapID).list_selectedNodeID;
});
export const GetSelectedNode_InList = StoreAccessor(s=>(mapID: string)=>{
	const nodeID = GetSelectedNodeID_InList(mapID);
	return GetNode(nodeID);
});

export const GetMap_List_SelectedNode_OpenPanel = StoreAccessor(s=>(mapID: string)=>{
	return s.main.maps.mapStates.get(mapID).list_selectedNode_openPanel;
});

export const GetTimelinePanelOpen = StoreAccessor(s=>(mapID: string): boolean=>{
	if (mapID == null) return false;
	return s.main.maps.mapStates.get(mapID).timelinePanelOpen;
});
export const GetTimelineOpenSubpanel = StoreAccessor(s=>(mapID: string)=>{
	if (mapID == null) return null;
	return s.main.maps.mapStates.get(mapID).timelineOpenSubpanel;
});
export const GetShowTimelineDetails = StoreAccessor(s=>(mapID: string): boolean=>{
	if (mapID == null) return null;
	return s.main.maps.mapStates.get(mapID).showTimelineDetails;
});

// timeline-related
// ==========

/*export const GetSelectedTimeline = StoreAccessor(s=>(mapID: string): Timeline=>{
	if (mapID == null) return null;
	const timelineID = s.main.maps.mapStates.get(mapID).selectedTimeline;
	return GetTimeline(timelineID);
});
export const GetPlayingTimeline = StoreAccessor(s=>(mapID: string): Timeline=>{
	if (mapID == null) return null;
	/* const mapInfo = State('main', 'maps', mapID) as MapInfo;
	// const timelineID = State('main', 'maps', mapID, 'playingTimeline');
	if (mapInfo == null || !mapInfo.timelinePanelOpen || mapInfo.timelineOpenSubpanel != TimelineSubpanel.Playing) return null;
	const timelineID = mapInfo.selectedTimeline;
	return GetTimeline(timelineID); *#/
	if (!s.main.maps.mapStates.get(mapID).timelinePanelOpen || s.main.maps.mapStates.get(mapID).timelineOpenSubpanel != TimelineSubpanel.playing) return null;
	const timelineID = s.main.maps.mapStates.get(mapID).selectedTimeline;
	return GetTimeline(timelineID);
});
/* export const GetPlayingTimelineTime = StoreAccessor((mapID: string): number => {
	if (mapID == null) return null;
	return State('main', 'maps', mapID, 'playingTimeline_time');
}); *#/
export const GetPlayingTimelineStepIndex = StoreAccessor(s=>(mapID: string): number=>{
	if (mapID == null) return null;
	return s.main.maps.mapStates.get(mapID).playingTimeline_step;
});
export const GetPlayingTimelineStep = StoreAccessor(s=>(mapID: string)=>{
	const playingTimeline = GetPlayingTimeline(mapID);
	if (playingTimeline == null) return null;
	const stepIndex = GetPlayingTimelineStepIndex(mapID) || 0;
	const stepID = playingTimeline.steps[stepIndex];
	return GetTimelineStep(stepID);
});
export const GetPlayingTimelineCurrentStepRevealNodes = StoreAccessor(s=>(mapID: string): string[]=>{
	const playingTimeline_currentStep = GetPlayingTimelineStep(mapID);
	if (playingTimeline_currentStep == null) return emptyArray;
	return GetNodesRevealedInSteps([playingTimeline_currentStep]);
});

export const GetPlayingTimelineRevealNodes_All = StoreAccessor(s=>(mapID: string): string[]=>{
	const map = GetMap(mapID);
	if (!map) return emptyArray;

	const playingTimeline = GetPlayingTimeline(mapID);
	const steps = playingTimeline ? GetTimelineSteps(playingTimeline) : emptyArray;
	return [`${map.rootNode}`].concat(GetNodesRevealedInSteps(steps));
});

export const GetPlayingTimelineAppliedStepIndex = StoreAccessor(s=>(mapID: string): number=>{
	if (mapID == null) return null;
	return s.main.maps.mapStates.get(mapID).playingTimeline_appliedStep;
});
export const GetPlayingTimelineAppliedSteps = StoreAccessor(s=>(mapID: string, excludeAfterCurrentStep = false): TimelineStep[]=>{
	const playingTimeline = GetPlayingTimeline(mapID);
	if (playingTimeline == null) return emptyArray;
	let stepIndex = GetPlayingTimelineAppliedStepIndex(mapID) || -1;
	if (excludeAfterCurrentStep) {
		const currentStep = GetPlayingTimelineStepIndex(mapID);
		stepIndex = Math.min(currentStep, stepIndex);
	}
	const stepIDs = playingTimeline.steps.slice(0, stepIndex + 1);
	const steps = stepIDs.map(a=>GetTimelineStep(a));
	if (steps.Any(a=>a == null)) return emptyArray_forLoading;
	return steps;
});
export const GetPlayingTimelineRevealNodes_UpToAppliedStep = StoreAccessor(s=>(mapID: string, excludeAfterCurrentStep = false): string[]=>{
	const map = GetMap(mapID);
	if (!map) return emptyArray;

	const appliedSteps = GetPlayingTimelineAppliedSteps(mapID, excludeAfterCurrentStep);
	return [`${map.rootNode}`].concat(GetNodesRevealedInSteps(appliedSteps));
});

export const GetNodeRevealHighlightTime = StoreAccessor(s=>()=>{
	return s.main.timelines.nodeRevealHighlightTime;
});
export const GetTimeSinceNodeRevealedByPlayingTimeline = StoreAccessor(s=>(mapID: string, nodePath: string, timeSinceLastReveal = false, limitToJustPastHighlightRange = false): number=>{
	const appliedSteps = GetPlayingTimelineAppliedSteps(mapID, true);
	const nodeRevealTimes = GetNodeRevealTimesInSteps(appliedSteps, timeSinceLastReveal);
	const nodeRevealTime = nodeRevealTimes[nodePath];
	if (nodeRevealTime == null) return null;

	// const timelineTime = GetPlayingTimelineTime(mapID);
	const timelineTime = s.main.maps.mapStates.get(mapID).playingTimeline_time;
	let result = timelineTime - nodeRevealTime;
	if (limitToJustPastHighlightRange) {
		result = result.RoundTo(1); // round, to prevent unnecessary re-renders
		result = result.KeepBetween(0, GetNodeRevealHighlightTime() + 1); // cap to 0 through [highlight-time]+1, to prevent unneeded re-renders after X+1
	}
	return result;
});

export const GetTimeFromWhichToShowChangedNodes = StoreAccessor(s=>(mapID: string)=>{
	const type = s.main.maps.mapStates.get(mapID).showChangesSince_type;
	if (type == ShowChangesSinceType.none) return Number.MAX_SAFE_INTEGER; // from end of time (nothing)
	if (type == ShowChangesSinceType.allUnseenChanges) return 0; // from start of time (everything)
	if (PROD && !GetValues(ShowChangesSinceType).Contains(type)) return Number.MAX_SAFE_INTEGER; // defensive

	const visitOffset = s.main.maps.mapStates.get(mapID).showChangesSince_visitOffset;
	const lastMapViewTimes = FromJSON(localStorage.getItem(`lastMapViewTimes_${mapID}`) || "[]") as number[];
	if (lastMapViewTimes.length == 0) return Number.MAX_SAFE_INTEGER; // our first visit, so don't show anything

	const timeOfSpecifiedVisit = lastMapViewTimes[visitOffset.KeepAtMost(lastMapViewTimes.length - 1)];
	return timeOfSpecifiedVisit;
});*/