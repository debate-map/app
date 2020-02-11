import { Command } from "mobx-firelink";
import { TimelineStep } from "../Store/firebase/timelineSteps/@TimelineStep";
export declare class UpdateTimelineStep extends Command<{
    stepID: string;
    stepUpdates: Partial<TimelineStep>;
}, {}> {
    oldData: TimelineStep;
    newData: TimelineStep;
    Validate(): void;
    GetDBUpdates(): {};
}
