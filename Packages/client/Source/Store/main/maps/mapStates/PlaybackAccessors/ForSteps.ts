import {TimelineStep, GetTimelineStepTimeFromStart, GetTimelineStepEffectsResolved, GetTimelineStepTimesFromStart, GetNodeEffects, GetNode, GetNodeChildren} from "dm_common";
import {CE, emptyArray_forLoading, Assert} from "web-vcore/nm/js-vextensions";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {GetPlaybackInfo, GetPlaybackTime} from "./Basic.js";

export const IsTimelineStepActive = CreateAccessor((step: TimelineStep|n, timeX?: number|n)=>{
	const timeX_resolved = timeX ?? GetPlaybackTime();
	if (timeX_resolved == null) return false;
	const timeFromStart = GetTimelineStepTimeFromStart(step);
	if (timeFromStart == null) return false;
	return timeFromStart <= timeX_resolved;
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
		const nodeEffects = GetNodeEffects(step);
		for (const effect of nodeEffects) {
			const stepTime = stepTimes[index];
			const stepTime_safe = stepTime ?? 0;

			const nodesAreBeingRevealed = effect.show || effect.setExpandedTo == true;
			if (nodesAreBeingRevealed) {
				// whether we're targeting the entry's main-node for revealing, or its descendents, the main-node will always get revealed
				markPathRevealTime(effect.path, stepTime_safe);

				// for each ancestor-path of the entry's main-node, mark that path as revealed at this reveal's target-time (since whenever a node is revealed, its ancestors are as well)
				let ancestorPath = effect.path;
				while (ancestorPath.includes("/")) {
					ancestorPath = ancestorPath.slice(0, ancestorPath.lastIndexOf("/"));
					markPathRevealTime(ancestorPath, stepTime_safe);
				}

				// also reveal any descendants that are within the specified subdepth/range
				let descendentRevealDepth = 0;
				if (effect.show && effect.show_revealDepth != null) {
					descendentRevealDepth = Math.max(descendentRevealDepth, effect.show_revealDepth);
				}
				if (effect.setExpandedTo == true) {
					descendentRevealDepth = Math.max(descendentRevealDepth, 1);
				}
				if (descendentRevealDepth >= 1) {
					const node = GetNode(CE(effect.path.split("/")).Last());
					if (node == null) continue;
					// todo: fix that a child being null, apparently breaks the GetAsync() call in ActionProcessor.ts (for scrolling to just-revealed nodes)
					let currentChildren = GetNodeChildren(node.id).map(child=>({node: child, path: child && `${effect.path}/${child.id}`}));
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

			if (effect.setExpandedTo == false) {
				for (const path of CE(pathVisibilitiesSoFar).VKeys()) {
					if (path.startsWith(`${effect.path}/`)) { // note the slash at end (meaning it only hides descendants)
						markPathHideTime(path, stepTime_safe);
					}
				}
			}

			if (effect.hide) {
				for (const path of CE(pathVisibilitiesSoFar).VKeys()) {
					if (path.startsWith(effect.path)) {
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
		for (const effect of GetNodeEffects(step)) {
			if (effect.changeFocusLevelTo != null) {
				pathFocusLevels[effect.path] = effect.changeFocusLevelTo;
			}

			// hiding of nodes also unfocuses all of those nodes 
			if (effect.setExpandedTo == false) {
				for (const path of CE(pathFocusLevels).VKeys()) {
					if (path.startsWith(`${effect.path}/`)) { // note the slash at end (meaning it only unfocuses descendants)
						pathFocusLevels[effect.path] = 0;
					}
				}
			}
			if (effect.hide) {
				for (const path of CE(pathFocusLevels).VKeys()) {
					if (path.startsWith(effect.path)) {
						pathFocusLevels[effect.path] = 0;
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
		for (const effect of GetNodeEffects(step)) {
			if (effect.changeFocusLevelTo != null) {
				handleFocusLevelChange(effect.path, effect.changeFocusLevelTo, index);
			}

			// hiding of nodes also unfocuses all of those nodes 
			const pathsAmongRanges = ranges.map(a=>a.path).Distinct();
			if (effect.setExpandedTo == false) {
				for (const path of pathsAmongRanges) {
					if (path.startsWith(`${effect.path}/`)) { // note the slash at end (meaning it only unfocuses descendants)
						handleFocusLevelChange(path, 0, index);
					}
				}
			}
			if (effect.hide) {
				for (const path of pathsAmongRanges) {
					if (path.startsWith(effect.path)) {
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