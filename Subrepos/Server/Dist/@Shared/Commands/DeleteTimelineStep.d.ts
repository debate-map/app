import { Command } from "mobx-firelink";
import { TimelineStep } from "../Store/firebase/timelineSteps/@TimelineStep";
export declare class DeleteTimelineStep extends Command<{
    stepID: string;
}, {}> {
    oldData: TimelineStep;
    timeline_oldSteps: string[];
    Validate(): void;
    GetDBUpdates(): {};
}
