import {CreateAccessor, GetDoc, GetDocs} from "mobx-graphlink";
import {Timeline} from "./timelines/@Timeline.js";

export const GetTimelines = CreateAccessor((mapID: string): Timeline[]=>{
	return GetDocs({
		params: {filter: {
			mapID: {equalTo: mapID},
		}},
	}, a=>a.timelines);
});
export const GetTimeline = CreateAccessor((id: string|n)=>{
	return GetDoc({}, a=>a.timelines.get(id!));
});