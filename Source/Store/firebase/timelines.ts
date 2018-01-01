import {Map} from "./maps/@Map";
import {Timeline} from "./timelines/@Timeline";
import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {CachedTransform} from "js-vextensions";
import {emptyArray} from "../../Frame/Store/ReducerUtils";
import {TimelineStep} from "./timelineSteps/@TimelineStep";

/*export function GetTimelines(): Timeline[] {
	let timelinesMap = GetData("timelines");
	return CachedTransform("GetTimelines", [], timelinesMap, ()=>timelinesMap ? timelinesMap.VValues(true) : []);
}*/
export function GetTimeline(id: number): Timeline {
	if (id == null) return null;
	return GetData("timelines", id);
}

export function GetMapTimelineIDs(map: Map) {
	return (map.timelines || {}).VKeys(true).map(ToInt);
}
export function GetMapTimelines(map: Map) {
	let timelines = GetMapTimelineIDs(map).map(id=>GetTimeline(id));
	if (timelines.Any(a=>a == null)) return emptyArray;
	return CachedTransform("GetTimelinesForMap", [map._id], timelines, ()=>timelines);
}

export function GetTimelineStep(id: number): TimelineStep {
	if (id == null) return null;
	return GetData("timelineSteps", id);
}
export function GetTimelineSteps(timeline: Timeline): TimelineStep[] {
	let steps = (timeline.steps || []).map(id=>GetTimelineStep(id));
	if (steps.Any(a=>a == null)) return emptyArray;
	return CachedTransform("GetTimelineSteps", [timeline._id], steps, ()=>steps);
}