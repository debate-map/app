import { Timeline } from "./timelines/@Timeline";
import { TimelineStep } from "./timelineSteps/@TimelineStep";
export declare const GetTimelineStep: ((id: string) => TimelineStep) & {
    Wait: (id: string) => TimelineStep;
};
export declare const GetTimelineSteps: ((timeline: Timeline, emptyForLoading?: any) => TimelineStep[]) & {
    Wait: (timeline: Timeline, emptyForLoading?: any) => TimelineStep[];
};
export declare const GetNodeRevealTimesInSteps: ((steps: TimelineStep[], baseOnLastReveal?: any) => any[] | {
    [key: string]: number;
}) & {
    Wait: (steps: TimelineStep[], baseOnLastReveal?: any) => any[] | {
        [key: string]: number;
    };
};
export declare const GetNodesRevealedInSteps: ((steps: TimelineStep[]) => string[]) & {
    Wait: (steps: TimelineStep[]) => string[];
};
