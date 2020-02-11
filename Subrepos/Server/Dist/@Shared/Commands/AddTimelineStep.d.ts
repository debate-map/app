import { Command } from "mobx-firelink";
import { TimelineStep } from "../Store/firebase/timelineSteps/@TimelineStep";
export declare class AddTimelineStep extends Command<{
    timelineID: string;
    step: TimelineStep;
    stepIndex?: number;
}, {}> {
    stepID: string;
    timeline_oldSteps: string[];
    timeline_newSteps: string[];
    Validate(): void;
    GetDBUpdates(): any;
}
