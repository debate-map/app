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
	if (step.timeFromStart != null) return step.timeFromStart;

	const steps = GetTimelineSteps(step.timelineID);
	const index = steps.findIndex(a=>a.id == stepID);
	if (index == -1) return null;
	let totalTimeSoFar = 0;
	for (const step2 of steps) {
		if (step2.timeFromStart != null) {
			totalTimeSoFar = step2.timeFromStart;
		} else if (step2.timeFromLastStep != null) {
			totalTimeSoFar += step2.timeFromLastStep;
		}
		if (step2.id == step.id) break;
	}
	return totalTimeSoFar;
});
export const DoesTimelineStepMarkItselfActiveAtTimeX = CreateAccessor((stepID: string, timeX: number)=>{
	const timeFromStart = GetTimelineStepTimeFromStart(stepID);
	if (timeFromStart == null) return false;
	return timeFromStart <= timeX;
});

export const GetPathRevealTimesInSteps = CreateAccessor((steps: TimelineStep[], baseOnLastReveal = false)=>{
	const pathRevealTimes = {} as {[key: string]: number};
	for (const [index, step] of steps.entries()) {
		for (const reveal of step.nodeReveals || []) {
			if (reveal.show) {
				const stepTime = GetTimelineStepTimeFromStart(step.id);
				const stepTime_safe = stepTime ?? CE(steps.slice(0, index).map(a=>GetTimelineStepTimeFromStart(a.id))).LastOrX(a=>a != null) ?? 0;
				if (baseOnLastReveal) {
					pathRevealTimes[reveal.path] = Math.max(stepTime_safe, ToNumber(pathRevealTimes[reveal.path], 0));
				} else {
					pathRevealTimes[reveal.path] = Math.min(stepTime_safe, ToNumber(pathRevealTimes[reveal.path], Number.MAX_SAFE_INTEGER));
				}

				const revealDepth = ToNumber(reveal.show_revealDepth, 0);
				if (revealDepth >= 1) {
					const node = GetNode(CE(reveal.path.split("/")).Last());
					if (node == null) continue;
					// todo: fix that a child being null, apparently breaks the GetAsync() call in ActionProcessor.ts (for scrolling to just-revealed nodes)
					let currentChildren = GetNodeChildren(node.id).map(child=>({node: child, path: child && `${reveal.path}/${child.id}`}));
					if (CE(currentChildren).Any(a=>a.node == null)) {
						// if (steps.length == 1 && steps[0].id == 'clDjK76mSsGXicwd7emriw') debugger;
						return emptyArray_forLoading;
					}

					for (let childrenDepth = 1; childrenDepth <= revealDepth; childrenDepth++) {
						const nextChildren = [];
						for (const child of currentChildren) {
							if (baseOnLastReveal) {
								pathRevealTimes[child.path] = Math.max(stepTime_safe, ToNumber(pathRevealTimes[child.path], 0));
							} else {
								pathRevealTimes[child.path] = Math.min(stepTime_safe, ToNumber(pathRevealTimes[child.path], Number.MAX_SAFE_INTEGER));
							}
							// if there's another loop/depth after this one
							if (childrenDepth < revealDepth) {
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
			} else if (reveal.hide) {
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
export const GetPathsRevealedInSteps = CreateAccessor((steps: TimelineStep[])=>{
	return CE(GetPathRevealTimesInSteps(steps)).VKeys();
});