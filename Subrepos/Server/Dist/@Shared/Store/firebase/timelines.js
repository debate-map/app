import { emptyArray_forLoading, CE } from "js-vextensions";
import { GetDoc, StoreAccessor } from "mobx-firelink";
/* export function GetTimelines(): Timeline[] {
    let timelinesMap = GetData({collection: true}, "timelines");
    return CachedTransform("GetTimelines", [], timelinesMap, ()=>timelinesMap ? timelinesMap.VValues(true) : []);
} */
export const GetTimeline = StoreAccessor(s => (id) => {
    if (id == null)
        return null;
    return GetDoc({}, a => a.timelines.get(id));
});
export function GetMapTimelineIDs(map) {
    return CE(map.timelines || {}).VKeys();
}
export const GetMapTimelines = StoreAccessor(s => (map) => {
    const timelines = GetMapTimelineIDs(map).map(id => GetTimeline(id));
    if (CE(timelines).Any(a => a == null))
        return emptyArray_forLoading;
    return timelines;
});
