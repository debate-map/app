import { Map } from "./maps/@Map";
import { Timeline } from "./timelines/@Timeline";
export declare const GetTimeline: ((id: string) => Timeline) & {
    Wait: (id: string) => Timeline;
};
export declare function GetMapTimelineIDs(map: Map): string[];
export declare const GetMapTimelines: ((map: Map) => any[]) & {
    Wait: (map: Map) => any[];
};
