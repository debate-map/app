import {TimelineStep, GetTimelineStepTimeFromStart, GetTimelineStepTimesFromStart, GetNodeEffects, GetNode, GetNodeChildren} from "dm_common";
import {CE, emptyArray_forLoading, Assert} from "js-vextensions";
import {CreateAccessor} from "mobx-graphlink";
import {GetPlaybackInfo, GetPlaybackTime} from "./Basic.js";

export const IsTimelineStepActive = CreateAccessor((step: TimelineStep|n, timeX?: number|n)=>{
	const timeX_resolved = timeX ?? GetPlaybackTime();
	if (timeX_resolved == null) return false;
	const timeFromStart = GetTimelineStepTimeFromStart(step);
	if (timeFromStart == null) return false;
	return timeFromStart <= timeX_resolved;
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