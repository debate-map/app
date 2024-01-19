import {emptyArray, ToNumber, emptyArray_forLoading, CE, Assert} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, CreateAccessor, GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {Timeline} from "./timelines/@Timeline.js";
import {TimelineStep} from "./timelineSteps/@TimelineStep.js";
import {GetNode, GetNodeChildren} from "./nodes.js";
import {GetTimelineStepEffectsResolved} from "../DB.js";

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
export const DoesTimelineStepMarkItselfActiveAtTimeX = CreateAccessor((step: TimelineStep|n, timeX: number)=>{
	const timeFromStart = GetTimelineStepTimeFromStart(step);
	if (timeFromStart == null) return false;
	return timeFromStart <= timeX;
});

export const GetTimeTrackerStateAtTimeX = CreateAccessor((steps: TimelineStep[], timeX: number)=>{
	let timeTrackerState = false;

	const effects = GetTimelineStepEffectsResolved(steps);
	for (const effect of effects) {
		if (effect.time_absolute > timeX) break;
		if (effect.setTimeTrackerState != null) {
			timeTrackerState = effect.setTimeTrackerState;
		}
	}

	return timeTrackerState;
});

export const GetTalkTimeSummaryAtTimeX = CreateAccessor((steps: TimelineStep[], timeX: number)=>{
	const talkTimeTotals = {} as {[key: string]: number};
	let currentTalker: string|n = null;

	const stepTimes = GetTimelineStepTimesFromStart(steps);
	for (const [index, step] of steps.entries()) {
		const stepTime = stepTimes[index];
		const stepTime_safe = stepTime ?? 0;
		if (stepTime_safe > timeX) break; // if this step's start is alraedy out of range, break loop

		const endTime = stepTimes[index + 1];
		const endTime_safe = endTime ?? timeX;
		const endTime_safe_upToTimeX = Math.min(endTime_safe, timeX);

		if (timeX >= stepTime_safe && timeX < endTime_safe) {
			currentTalker = step.groupID;
		}

		const talker = ["left", "right"].includes(step.groupID) ? step.groupID : null; // todo: probably update this to check actual speaker-name later
		if (talker != null) {
			const talkDurationForThisStep = endTime_safe_upToTimeX - stepTime_safe;
			talkTimeTotals[talker] = (talkTimeTotals[talker] ?? 0) + talkDurationForThisStep;
		}
	}

	return {
		talkTimeTotals,
		currentTalker,
	};
});

export const GetVisiblePathRevealTimesInSteps = CreateAccessor((steps: TimelineStep[], baseOn: "first reveal" | "last fresh reveal" = "last fresh reveal")=>{
	const pathRevealTimes_first = {} as {[key: string]: number};
	const pathRevealTimes_lastFresh = {} as {[key: string]: number};
	const pathVisibilitiesSoFar = {} as {[key: string]: boolean};
	const markPathRevealTime = (path: string, time: number)=>{
		const wasRevealedAtSomePriorStep = pathRevealTimes_first[path] != null;
		const wasRevealedAsOfLastStep = pathVisibilitiesSoFar[path] ?? false;

		if (!wasRevealedAtSomePriorStep) pathRevealTimes_first[path] = time;
		if (!wasRevealedAsOfLastStep) pathRevealTimes_lastFresh[path] = time;
		pathVisibilitiesSoFar[path] = true;
	};
	const markPathHideTime = (path: string, time: number)=>{
		//delete pathRevealTimes_lastFresh[path];
		pathVisibilitiesSoFar[path] = false;
	};

	const stepTimes = GetTimelineStepTimesFromStart(steps);
	for (const [index, step] of steps.entries()) {
		for (const reveal of step.nodeReveals || []) {
			const stepTime = stepTimes[index];
			const stepTime_safe = stepTime ?? 0;

			const nodesAreBeingRevealed = reveal.show || reveal.setExpandedTo == true;
			if (nodesAreBeingRevealed) {
				// whether we're targeting the entry's main-node for revealing, or its descendents, the main-node will always get revealed
				markPathRevealTime(reveal.path, stepTime_safe);

				// for each ancestor-path of the entry's main-node, mark that path as revealed at this reveal's target-time (since whenever a node is revealed, its ancestors are as well)
				let ancestorPath = reveal.path;
				while (ancestorPath.includes("/")) {
					ancestorPath = ancestorPath.slice(0, ancestorPath.lastIndexOf("/"));
					markPathRevealTime(ancestorPath, stepTime_safe);
				}

				// also reveal any descendants that are within the specified subdepth/range
				let descendentRevealDepth = 0;
				if (reveal.show && reveal.show_revealDepth != null) {
					descendentRevealDepth = Math.max(descendentRevealDepth, reveal.show_revealDepth);
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
							markPathRevealTime(child.path, stepTime_safe);
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
			}

			if (reveal.setExpandedTo == false) {
				for (const path of CE(pathVisibilitiesSoFar).VKeys()) {
					if (path.startsWith(`${reveal.path}/`)) { // note the slash at end (meaning it only hides descendants)
						markPathHideTime(path, stepTime_safe);
					}
				}
			}

			if (reveal.hide) {
				for (const path of CE(pathVisibilitiesSoFar).VKeys()) {
					if (path.startsWith(reveal.path)) {
						markPathHideTime(path, stepTime_safe);
					}
				}
			}
		}
	}

	const visiblePathsAtEnd = pathVisibilitiesSoFar.Pairs().filter(a=>a.value == true).map(a=>a.key);
	return visiblePathsAtEnd.ToMapObj(path=>path, path=>{
		if (baseOn == "first reveal") return pathRevealTimes_first[path];
		if (baseOn == "last fresh reveal") return pathRevealTimes_lastFresh[path];
		Assert(false, "Invalid baseOn value.");
	});
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

			// hiding of nodes also unfocuses all of those nodes 
			if (reveal.setExpandedTo == false) {
				for (const path of CE(pathFocusLevels).VKeys()) {
					if (path.startsWith(`${reveal.path}/`)) { // note the slash at end (meaning it only unfocuses descendants)
						pathFocusLevels[reveal.path] = 0;
					}
				}
			}
			if (reveal.hide) {
				for (const path of CE(pathFocusLevels).VKeys()) {
					if (path.startsWith(reveal.path)) {
						pathFocusLevels[reveal.path] = 0;
					}
				}
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

	const handleFocusLevelChange = (path: string, focusLevel: number, stepIndex: number)=>{
		// if there is no focus-level-range added for this path yet, add one "synthetic" one with level-0, that starts at index 0 (this simplifies handling logic, to have all steps covered by a range)
		if (ranges.filter(a=>a.path == path).length == 0) {
			ranges.push(new PathFocusLevelRange({
				path,
				focusLevel: 0,
				firstStep: 0,
				//lastStep: index - 1, // have this filled in by regular logic below
				//endStep: index, // have this filled in by regular logic below
			}));
		}

		const currentRange = ranges.filter(a=>a.path == path && a.lastStep == null).LastOrX();
		const currentFocusLevel = currentRange?.focusLevel ?? 0;

		// if this step changes the focus-level for the node, add a new range for the new focus-level
		if (focusLevel != currentFocusLevel) {
			if (currentRange != null) {
				currentRange.lastStep = stepIndex - 1;
				currentRange.endStep = stepIndex;
			}
			ranges.push(new PathFocusLevelRange({
				path,
				focusLevel,
				firstStep: stepIndex,
			}));
		}
	};

	for (const [index, step] of steps.entries()) {
		for (const reveal of step.nodeReveals || []) {
			if (reveal.changeFocusLevelTo != null) {
				handleFocusLevelChange(reveal.path, reveal.changeFocusLevelTo, index);
			}

			// hiding of nodes also unfocuses all of those nodes 
			const pathsAmongRanges = ranges.map(a=>a.path).Distinct();
			if (reveal.setExpandedTo == false) {
				for (const path of pathsAmongRanges) {
					if (path.startsWith(`${reveal.path}/`)) { // note the slash at end (meaning it only unfocuses descendants)
						handleFocusLevelChange(path, 0, index);
					}
				}
			}
			if (reveal.hide) {
				for (const path of pathsAmongRanges) {
					if (path.startsWith(reveal.path)) {
						handleFocusLevelChange(path, 0, index);
					}
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