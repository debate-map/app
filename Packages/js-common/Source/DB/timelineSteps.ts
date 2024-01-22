import {emptyArray, ToNumber, emptyArray_forLoading, CE, Assert} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, CreateAccessor, GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {Timeline} from "./timelines/@Timeline.js";
import {TimelineStep} from "./timelineSteps/@TimelineStep.js";
import {GetNode, GetNodeChildren} from "./nodes.js";
import {GetNodeEffects, GetTimelineStepEffectsResolved} from "../DB.js";

export const GetTimelineStep = CreateAccessor((id: string|n): TimelineStep|n=>{
	return GetDoc({}, a=>a.timelineSteps.get(id!));
});
/** In most cases, this is more efficient than GetTimelineStep, since it makes (and caches) only one backend query. */
export const GetTimelineStep_Batched = CreateAccessor((id: string|n, timelineID: string): TimelineStep|n=>{
	const steps = GetTimelineSteps(timelineID);
	return steps.find(a=>a.id == id);
});
export const GetTimelineSteps = CreateAccessor((timelineID: string, orderByOrderKeys = true): TimelineStep[]=>{
	let result = GetDocs({
		params: {filter: {
			timelineID: {equalTo: timelineID},
		}},
	}, a=>a.timelineSteps);
	if (orderByOrderKeys) result = result.OrderBy(a=>a.orderKey);
	return result;
});

export const GetTimelineStepTimeFromStart = CreateAccessor((step: TimelineStep|n): number|null=>{
	//const step = GetTimelineStep(stepID);
	if (step == null) return null;
	// quick route: if step's time is specified absolutely, just return that
	if (step.timeFromStart != null) return step.timeFromStart;

	const steps = GetTimelineSteps(step.timelineID);
	const stepIndex = steps.findIndex(a=>a.id == step.id);
	if (stepIndex == -1) return null;

	/*const stepsUpToStep = steps.slice(0, stepIndex + 1);
	const stepTimes = GetTimelineStepTimesFromStart(stepsUpToStep);*/
	// best to just get the step-times for all steps; this way we only need to cache one return-value for the "GetTimelineStepTimesFromStart" function 
	const stepTimes = GetTimelineStepTimesFromStart(steps);
	return stepTimes[stepIndex];
});
export const GetTimelineStepTimesFromStart = CreateAccessor((steps: TimelineStep[])=>{
	const result = [] as number[];
	let lastTimeReached = 0;
	for (const step of steps) {
		if (step.timeFromStart != null) {
			lastTimeReached = step.timeFromStart;
		} else if (step.timeFromLastStep != null) {
			lastTimeReached += step.timeFromLastStep;
		}
		result.push(lastTimeReached);
		if (step.timeUntilNextStep != null) {
			lastTimeReached += step.timeUntilNextStep;
		}
	}
	return result;
});
export const GetTimelineStepsReachedByTimeX = CreateAccessor((timelineID: string, timeX: number)=>{
	const steps = GetTimelineSteps(timelineID);
	const stepTimes = GetTimelineStepTimesFromStart(steps);
	return steps.filter((_, i)=>stepTimes[i] <= timeX);
});