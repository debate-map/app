import {emptyArray, ToNumber, emptyArray_forLoading, CE} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, CreateAccessor, GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {Timeline} from "./timelines/@Timeline.js";
import {TimelineStep} from "./timelineSteps/@TimelineStep.js";
import {GetNode, GetNodeChildren} from "./nodes.js";

export const GetTimelineStep = CreateAccessor((id: string|n): TimelineStep|n=>{
	return GetDoc({}, a=>a.timelineSteps.get(id!));
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

export const GetTimelineStepTimeFromStart = CreateAccessor((stepID: string|n): number|null=>{
	const step = GetTimelineStep(stepID);
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
	}
	return result;
});
export const GetTimelineStepsReachedByTimeX = CreateAccessor((timelineID: string, timeX: number)=>{
	const steps = GetTimelineSteps(timelineID);
	const stepTimes = GetTimelineStepTimesFromStart(steps);
	return steps.filter((_, i)=>stepTimes[i] <= timeX);
});
export const DoesTimelineStepMarkItselfActiveAtTimeX = CreateAccessor((stepID: string, timeX: number)=>{
	const timeFromStart = GetTimelineStepTimeFromStart(stepID);
	if (timeFromStart == null) return false;
	return timeFromStart <= timeX;
});

export const GetVisiblePathRevealTimesInSteps = CreateAccessor((steps: TimelineStep[], baseOnLastReveal = false)=>{
	const pathRevealTimes = {} as {[key: string]: number};
	const stepTimes = GetTimelineStepTimesFromStart(steps);
	for (const [index, step] of steps.entries()) {
		for (const reveal of step.nodeReveals || []) {
			const stepTime = stepTimes[index];
			const stepTime_safe = stepTime ?? 0;

			let descendentRevealDepth = 0;
			if (reveal.show) {
				if (baseOnLastReveal) {
					pathRevealTimes[reveal.path] = Math.max(stepTime_safe, ToNumber(pathRevealTimes[reveal.path], 0));
				} else {
					pathRevealTimes[reveal.path] = Math.min(stepTime_safe, ToNumber(pathRevealTimes[reveal.path], Number.MAX_SAFE_INTEGER));
				}

				descendentRevealDepth = Math.max(descendentRevealDepth, reveal.show_revealDepth ?? 0);
			}
			if (reveal.setExpandedTo == true) {
				descendentRevealDepth = Math.max(descendentRevealDepth, 1);
			}
			if (descendentRevealDepth >= 1) {
				const node = GetNode(CE(reveal.path.split("/")).Last());
				if (node == null) continue;
				// todo: fix that a child being null, apparently breaks the GetAsync() call in ActionProcessor.ts (for scrolling to just-revealed nodes)
				let currentChildren = GetNodeChildren(node.id).map(child=>({node: child, path: child && `${reveal.path}/${child.id}`}));
				if (CE(currentChildren).Any(a=>a.node == null)) {
					// if (steps.length == 1 && steps[0].id == 'clDjK76mSsGXicwd7emriw') debugger;
					return emptyArray_forLoading;
				}

				for (let childrenDepth = 1; childrenDepth <= descendentRevealDepth; childrenDepth++) {
					const nextChildren = [];
					for (const child of currentChildren) {
						if (baseOnLastReveal) {
							pathRevealTimes[child.path] = Math.max(stepTime_safe, ToNumber(pathRevealTimes[child.path], 0));
						} else {
							pathRevealTimes[child.path] = Math.min(stepTime_safe, ToNumber(pathRevealTimes[child.path], Number.MAX_SAFE_INTEGER));
						}
						// if there's another loop/depth after this one
						if (childrenDepth < descendentRevealDepth) {
							const childChildren = GetNodeChildren(child.node.id).map(child2=>({node: child2, path: child2 && `${child.path}/${child2.id}`}));
							if (CE(childChildren).Any(a=>a == null)) {
								// if (steps.length == 1 && steps[0].id == 'clDjK76mSsGXicwd7emriw') debugger;
								return emptyArray_forLoading;
							}
							CE(nextChildren).AddRange(childChildren);
						}
					}
					currentChildren = nextChildren;
				}
			}

			if (reveal.setExpandedTo == false) {
				for (const path of CE(pathRevealTimes).VKeys()) {
					if (path.startsWith(`${reveal.path}/`)) { // note the slash at end (meaning it only hides descendants)
						delete pathRevealTimes[path];
					}
				}
			}

			if (reveal.hide) {
				for (const path of CE(pathRevealTimes).VKeys()) {
					if (path.startsWith(reveal.path)) {
						delete pathRevealTimes[path];
					}
				}
			}
		}
	}
	return pathRevealTimes;
});
export const GetVisiblePathsAfterSteps = CreateAccessor((steps: TimelineStep[])=>{
	return CE(GetVisiblePathRevealTimesInSteps(steps)).VKeys();
});

export const GetPathFocusLevelsAfterSteps = CreateAccessor((steps: TimelineStep[])=>{
	const pathFocusLevels = {} as {[key: string]: number};
	for (const [index, step] of steps.entries()) {
		for (const reveal of step.nodeReveals || []) {
			if (reveal.changeFocusLevelTo != null) {
				pathFocusLevels[reveal.path] = reveal.changeFocusLevelTo;
			}
		}
	}
	return pathFocusLevels;
});
export const GetPathsWith1PlusFocusLevelAfterSteps = CreateAccessor((steps: TimelineStep[])=>{
	return Object.entries(GetPathFocusLevelsAfterSteps(steps)).filter(a=>a[1] >= 1).map(a=>a[0]);
});

export const GetPathFocusLevelRangesWithinSteps = CreateAccessor((steps: TimelineStep[])=>{
	const ranges = [] as PathFocusLevelRange[];
	for (const [index, step] of steps.entries()) {
		for (const reveal of step.nodeReveals || []) {
			if (reveal.changeFocusLevelTo != null) {
				// if there is no focus-level-range added for this path yet, add one "synthetic" one with level-0, that starts at index 0 (this simplifies handling logic, to have all steps covered by a range)
				if (ranges.filter(a=>a.path == reveal.path).length == 0) {
					ranges.push(new PathFocusLevelRange({
						path: reveal.path,
						focusLevel: 0,
						firstStep: 0,
						//lastStep: index - 1, // have this filled in by regular logic below
						//endStep: index, // have this filled in by regular logic below
					}));
				}

				const currentRange = ranges.filter(a=>a.path == reveal.path && a.lastStep == null).LastOrX();
				const currentFocusLevel = currentRange?.focusLevel ?? 0;

				// if this step changes the focus-level for the node, add a new range for the new focus-level
				if (reveal.changeFocusLevelTo != currentFocusLevel) {
					if (currentRange != null) {
						currentRange.lastStep = index - 1;
						currentRange.endStep = index;
					}
					ranges.push(new PathFocusLevelRange({
						path: reveal.path,
						focusLevel: reveal.changeFocusLevelTo,
						firstStep: index,
					}));
				}
			}
		}
	}
	return ranges;
});
export class PathFocusLevelRange {
	constructor(data?: Partial<PathFocusLevelRange>) {
		Object.assign(this, data);
	}
	path: string;
	focusLevel: number;
	firstStep: number;
	lastStep: number|n; // the last step within the range (inclusive)
	endStep: number|n; // the step that ends the range (exclusive)
}