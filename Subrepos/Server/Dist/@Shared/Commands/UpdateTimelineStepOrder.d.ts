import { Command } from "mobx-firelink";
export declare class UpdateTimelineStepOrder extends Command<{
    timelineID: string;
    stepID: string;
    newIndex: number;
}, {}> {
    timeline_oldSteps: string[];
    timeline_newSteps: string[];
    Validate(): void;
    GetDBUpdates(): any;
}
