import { Command } from "mobx-firelink";
import { Timeline } from "../Store/firebase/timelines/@Timeline";
export declare class DeleteTimeline extends Command<{
    timelineID: string;
}, {}> {
    oldData: Timeline;
    Validate(): void;
    GetDBUpdates(): {};
}
