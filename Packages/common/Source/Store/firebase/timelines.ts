import {CachedTransform, emptyArray, ToInt, emptyArray_forLoading, CE} from "../../../Commands/node_modules/js-vextensions";
import {GetDoc, StoreAccessor} from "../../../Commands/node_modules/mobx-firelink";
import {Map} from "./maps/@Map";
import {Timeline} from "./timelines/@Timeline";
import {TimelineStep} from "./timelineSteps/@TimelineStep";

/* export function GetTimelines(): Timeline[] {
	let timelinesMap = GetData({collection: true}, "timelines");
	return CachedTransform("GetTimelines", [], timelinesMap, ()=>timelinesMap ? timelinesMap.VValues(true) : []);
} */
export const GetTimeline = StoreAccessor(s=>(id: string): Timeline=>{
	if (id == null) return null;
	return GetDoc({}, a=>a.timelines.get(id));
});

export function GetMapTimelineIDs(map: Map) {
	return CE(map.timelines || {}).VKeys();
}
export const GetMapTimelines = StoreAccessor(s=>(map: Map)=>{
	const timelines = GetMapTimelineIDs(map).map(id=>GetTimeline(id));
	if (CE(timelines).Any(a=>a == null)) return emptyArray_forLoading;
	return timelines;
});