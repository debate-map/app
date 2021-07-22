import {CachedTransform, emptyArray, ToInt, emptyArray_forLoading, CE} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {Map} from "./maps/@Map.js";
import {Timeline} from "./timelines/@Timeline.js";
import {TimelineStep} from "./timelineSteps/@TimelineStep.js";

/*export function GetTimelines(): Timeline[] {
	let timelinesMap = GetData({collection: true}, "timelines");
	return CachedTransform("GetTimelines", [], timelinesMap, ()=>timelinesMap ? timelinesMap.VValues(true) : []);
}*/
/*export const GetTimeline = CreateAccessor((id: string): Timeline=>{
	if (id == null) return null;
	//return GetDoc({}, a=>a.timelines.get(id));
	return null;
});

export function GetMapTimelineIDs(map: Map) {
	return CE(map.timelines || {}).VKeys();
}
export const GetMapTimelines = CreateAccessor((map: Map)=>{
	const timelines = GetMapTimelineIDs(map).map(id=>GetTimeline(id));
	if (CE(timelines).Any(a=>a == null)) return emptyArray_forLoading;
	return timelines;
});*/