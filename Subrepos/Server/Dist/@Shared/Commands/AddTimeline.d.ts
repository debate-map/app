import { Command } from "mobx-firelink";
import { Timeline } from "../Store/firebase/timelines/@Timeline";
export declare class AddTimeline extends Command<{
    mapID: string;
    timeline: Timeline;
}, string> {
    timelineID: string;
    Validate(): void;
    GetDBUpdates(): any;
}
