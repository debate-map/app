import {GetOpenMapID} from "Store/main";
import {GetMap, GetTimeline, GetTimelineSteps, GetTimelineStep, TimelineStep} from "dm_common";
import {emptyArray} from "web-vcore/nm/js-vextensions";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {GetMapState, GetNodeRevealHighlightTime} from "../$mapState.js";
import {GetPlaybackVisiblePathRevealTimes} from "./ForEffects.js";

/** Checks whether "playback of a timeline is active", and if so, returns some info for it. */
export const GetPlaybackInfo = CreateAccessor(()=>{
	// playback can only occur for the main open-map
	const mapID = GetOpenMapID();
	// that map must also exist/be-loaded
	const map = GetMap(mapID);
	if (map == null) return null;

	// and its map-state must also exist/be-loaded
	const mapState = GetMapState(mapID);
	if (mapState == null) return null;
	// and its map-state must have the timeline-panel open, and playback enabled
	if (!mapState.timelinePanelOpen || !mapState.timelinePlayback) return null;

	// and the referenced timeline must also exist/be-loaded
	const timeline = GetTimeline(mapState.selectedTimeline);
	if (timeline == null) return null;

	// if all those conditions are met, then "playback is active" (no need to check for MapUI page/visibility, since these accessors are not really used/relevant outside a MapUI tree)
	return {mapID, map, mapState, timeline};
});
export const GetPlaybackInfoFor = CreateAccessor((mapID: string)=>{
	const playback = GetPlaybackInfo();
	if (playback?.mapID != mapID) return null;
	return playback;
});

/*export const GetPlaybackSteps = CreateAccessor((): TimelineStep[]=>{
	const playback = GetPlaybackInfo();
	if (playback == null) return emptyArray;
	return GetTimelineSteps(playback.timeline.id);
});*/
export const GetPlaybackTime = CreateAccessor((): number|n=>{
	const playback = GetPlaybackInfo();
	if (playback == null) return null;
	return playback.mapState.playingTimeline_time;
});
export const GetPlaybackCurrentStepIndex = CreateAccessor((): number|n=>{
	const playback = GetPlaybackInfo();
	if (playback == null) return null;
	return playback.mapState.playingTimeline_step;
});
export const GetPlaybackCurrentStep = CreateAccessor(()=>{
	const playback = GetPlaybackInfo();
	if (playback == null) return null;
	const stepIndex = GetPlaybackCurrentStepIndex() || 0;
	const steps = GetTimelineSteps(playback.timeline.id);
	const step = steps[stepIndex];
	return GetTimelineStep(step.id);
});

/*export const GetPlaybackAppliedStepIndex = CreateAccessor((): number|n=>{
	const playback = GetPlaybackInfo();
	if (playback == null) return null;
	return playback.mapState.playingTimeline_appliedStep;
});
export const GetPlaybackAppliedSteps = CreateAccessor((mapID: string, excludeAfterCurrentStep = false): TimelineStep[]=>{
	const playback = GetPlaybackInfo();
	if (playback == null) return emptyArray;
	let stepIndex = GetPlaybackAppliedStepIndex() ?? -1;
	if (excludeAfterCurrentStep) {
		const currentStep = GetPlaybackCurrentStepIndex() ?? 0;
		stepIndex = Math.min(currentStep, stepIndex);
	}
	const steps = GetTimelineSteps(playback.timeline.id);
	return steps.slice(0, stepIndex + 1);
});
export const GetPlaybackVisiblePaths_UpToAppliedStep = CreateAccessor((mapID: string, excludeAfterCurrentStep = false): string[]=>{
	const map = GetMap(mapID);
	if (!map) return emptyArray;

	const appliedSteps = GetPlaybackAppliedSteps(mapID, excludeAfterCurrentStep);
	return [`${map.rootNode}`].concat(GetVisiblePathsAfterSteps(appliedSteps));
});*/

export const GetPlaybackTimeSinceNodeRevealed = CreateAccessor((mapID: string, nodePath: string, timeSinceLastReveal = false, limitToJustPastHighlightRange = false): number|n=>{
	const nodeRevealTimes = GetPlaybackVisiblePathRevealTimes(timeSinceLastReveal ? "last fresh reveal" : "first reveal");
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