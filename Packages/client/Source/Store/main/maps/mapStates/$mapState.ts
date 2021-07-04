import {emptyArray, FromJSON, GetValues, ToNumber, emptyArray_forLoading} from "web-vcore/nm/js-vextensions.js";
import {O} from "web-vcore";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {GetNode, GetNodesRevealedInSteps, GetMap} from "dm_common";
import {TimelineSubpanel, ShowChangesSinceType} from "./@MapState.js";

export const GetMapState = CreateAccessor(c=>(mapID: string|n)=>{
	return c.store.main.maps.mapStates.get(mapID!); // nn: get() actually accepts undefined
});

export const GetSelectedNodeID_InList = CreateAccessor(c=>(mapID: string)=>{
	return c.store.main.maps.mapStates.get(mapID)?.list_selectedNodeID;
});
export const GetSelectedNode_InList = CreateAccessor(c=>(mapID: string)=>{
	const nodeID = GetSelectedNodeID_InList(mapID);
	return GetNode(nodeID);
});

export const GetMap_List_SelectedNode_OpenPanel = CreateAccessor(c=>(mapID: string)=>{
	return c.store.main.maps.mapStates.get(mapID)?.list_selectedNode_openPanel;
});

export const GetTimelinePanelOpen = CreateAccessor(c=>(mapID: string): boolean=>{
	return c.store.main.maps.mapStates.get(mapID)?.timelinePanelOpen ?? false;
});
export const GetTimelineOpenSubpanel = CreateAccessor(c=>(mapID: string)=>{
	return c.store.main.maps.mapStates.get(mapID)?.timelineOpenSubpanel;
});
export const GetShowTimelineDetails = CreateAccessor(c=>(mapID: string): boolean=>{
	return c.store.main.maps.mapStates.get(mapID)?.showTimelineDetails ?? false;
});

// timeline-related
// ==========

/*export const GetSelectedTimeline = CreateAccessor(c=>(mapID: string): Timeline=>{
	if (mapID == null) return null;
	const timelineID = s.main.maps.mapStates.get(mapID).selectedTimeline;
	return GetTimeline(timelineID);
});
export const GetPlayingTimeline = CreateAccessor(c=>(mapID: string): Timeline=>{
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
export const GetPlayingTimelineStepIndex = CreateAccessor(c=>(mapID: string): number=>{
	if (mapID == null) return null;
	return s.main.maps.mapStates.get(mapID).playingTimeline_step;
});
export const GetPlayingTimelineStep = CreateAccessor(c=>(mapID: string)=>{
	const playingTimeline = GetPlayingTimeline(mapID);
	if (playingTimeline == null) return null;
	const stepIndex = GetPlayingTimelineStepIndex(mapID) || 0;
	const stepID = playingTimeline.steps[stepIndex];
	return GetTimelineStep(stepID);
});
export const GetPlayingTimelineCurrentStepRevealNodes = CreateAccessor(c=>(mapID: string): string[]=>{
	const playingTimeline_currentStep = GetPlayingTimelineStep(mapID);
	if (playingTimeline_currentStep == null) return emptyArray;
	return GetNodesRevealedInSteps([playingTimeline_currentStep]);
});

export const GetPlayingTimelineRevealNodes_All = CreateAccessor(c=>(mapID: string): string[]=>{
	const map = GetMap(mapID);
	if (!map) return emptyArray;

	const playingTimeline = GetPlayingTimeline(mapID);
	const steps = playingTimeline ? GetTimelineSteps(playingTimeline) : emptyArray;
	return [`${map.rootNode}`].concat(GetNodesRevealedInSteps(steps));
});

export const GetPlayingTimelineAppliedStepIndex = CreateAccessor(c=>(mapID: string): number=>{
	if (mapID == null) return null;
	return s.main.maps.mapStates.get(mapID).playingTimeline_appliedStep;
});
export const GetPlayingTimelineAppliedSteps = CreateAccessor(c=>(mapID: string, excludeAfterCurrentStep = false): TimelineStep[]=>{
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
export const GetPlayingTimelineRevealNodes_UpToAppliedStep = CreateAccessor(c=>(mapID: string, excludeAfterCurrentStep = false): string[]=>{
	const map = GetMap(mapID);
	if (!map) return emptyArray;

	const appliedSteps = GetPlayingTimelineAppliedSteps(mapID, excludeAfterCurrentStep);
	return [`${map.rootNode}`].concat(GetNodesRevealedInSteps(appliedSteps));
});

export const GetNodeRevealHighlightTime = CreateAccessor(c=>()=>{
	return s.main.timelines.nodeRevealHighlightTime;
});
export const GetTimeSinceNodeRevealedByPlayingTimeline = CreateAccessor(c=>(mapID: string, nodePath: string, timeSinceLastReveal = false, limitToJustPastHighlightRange = false): number=>{
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

export const GetTimeFromWhichToShowChangedNodes = CreateAccessor(c=>(mapID: string)=>{
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