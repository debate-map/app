import {GetNode, GetNodeChildren, GetNodeEffects, GetTimelineStepTimesFromStart, GetTimelineSteps, TimelineStep, TimelineStepEffect} from "dm_common";
import {Assert, CE, emptyArray, emptyArray_forLoading, emptyObj} from "web-vcore/nm/js-vextensions";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {GetPlaybackInfo, GetPlaybackTime} from "./Basic.js";

export class PlaybackEffect extends TimelineStepEffect {
	constructor(baseEffect: TimelineStepEffect, stepTime: number) {
		super(baseEffect);
		this.time_absolute = stepTime + this.time_relative;
	}
	time_absolute: number;
}
export const GetPlaybackEffects = CreateAccessor(()=>{
	const playback = GetPlaybackInfo();
	if (playback == null) return emptyArray as PlaybackEffect[];
	const steps = GetTimelineSteps(playback.timeline.id);
	const stepTimes = GetTimelineStepTimesFromStart(steps);

	const allEffects_resolved = [] as PlaybackEffect[];
	for (const [index, step] of steps.entries()) {
		const stepTime = stepTimes[index];
		const stepTime_safe = stepTime ?? 0;
		for (const effect of step.extras?.effects ?? []) {
			const effect_resolved = new PlaybackEffect(effect, stepTime_safe);
			allEffects_resolved.push(effect_resolved);
		}
	}
	return allEffects_resolved.OrderBy(a=>a.time_absolute);
});

// This naive implementation of GetPlaybackEffectsReached() is very inefficient, because it returns a new array each time the playback-time changes, breaking downstream caches.
// To fix this, we "condense" the current-time into a "simpler value" (`farthestEffectTimeReached`), which only changes when a new effect is reached -- thus allowing GetPlaybackEffectsReached() to cache properly.
/*export const GetPlaybackEffectsReached = CreateAccessor(()=>{
	const effects = GetPlaybackEffects();
	const time = GetPlaybackTime() ?? 0;
	return effects.filter(effect=>time >= effect.time_absolute);
});*/
export const GetPlaybackEffectTimes = CreateAccessor(()=>{
	const effects = GetPlaybackEffects();
	return effects.map(effect=>effect.time_absolute).Distinct();
});
export const GetFarthestPlaybackEffectTimeReached = CreateAccessor(()=>{
	const effectTimes = GetPlaybackEffectTimes();
	const playbackTime = GetPlaybackTime() ?? 0;
	return effectTimes.filter(effectTime=>effectTime <= playbackTime).LastOrX();
});
export const GetPlaybackEffectsReached = CreateAccessor(()=>{
	const effects = GetPlaybackEffects();
	const farthestEffectTimeReached = GetFarthestPlaybackEffectTimeReached() ?? 0;
	return effects.filter(effect=>effect.time_absolute <= farthestEffectTimeReached);
});

export const GetPlaybackTimeTrackerState = CreateAccessor(()=>{
	let timeTrackerState = false;
	const effects = GetPlaybackEffectsReached();
	for (const effect of effects) {
		if (effect.setTimeTrackerState != null) {
			timeTrackerState = effect.setTimeTrackerState;
		}
	}
	return timeTrackerState;
});

export const GetPlaybackVisiblePathRevealTimes = CreateAccessor((baseOn: "first reveal" | "last fresh reveal" = "last fresh reveal")=>{
	const playback = GetPlaybackInfo();
	if (playback == null) return emptyObj as {[key: string]: number};
	const effects = GetPlaybackEffectsReached();
	return GetVisiblePathRevealTimesAfterEffects([playback.map.rootNode], effects, baseOn);
});
export const GetPlaybackVisiblePaths = CreateAccessor(()=>{
	const result = CE(GetPlaybackVisiblePathRevealTimes()).VKeys();
	//console.log("New visible paths:", result);
	return result;
});

export const GetPathVisibilityInfoAfterEffects = CreateAccessor((pathsRevealedAtStart: string[], effects: PlaybackEffect[])=>{
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

	for (const path of pathsRevealedAtStart) {
		markPathRevealTime(path, 0);
	}

	//const effects = GetPlaybackEffectsReached();
	for (const stepEffect of effects) {
		const time_abs = stepEffect.time_absolute;
		const effect = stepEffect.nodeEffect;
		if (effect == null) continue;

		const nodesAreBeingRevealed = effect.show || effect.setExpandedTo == true;
		if (nodesAreBeingRevealed) {
			// whether we're targeting the entry's main-node for revealing, or its descendents, the main-node will always get revealed
			markPathRevealTime(effect.path, time_abs);

			// for each ancestor-path of the entry's main-node, mark that path as revealed at this reveal's target-time (since whenever a node is revealed, its ancestors are as well)
			let ancestorPath = effect.path;
			while (ancestorPath.includes("/")) {
				ancestorPath = ancestorPath.slice(0, ancestorPath.lastIndexOf("/"));
				markPathRevealTime(ancestorPath, time_abs);
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
					return null;
				}

				for (let childrenDepth = 1; childrenDepth <= descendentRevealDepth; childrenDepth++) {
					const nextChildren = [];
					for (const child of currentChildren) {
						markPathRevealTime(child.path, time_abs);
						// if there's another loop/depth after this one
						if (childrenDepth < descendentRevealDepth) {
							const childChildren = GetNodeChildren(child.node.id).map(child2=>({node: child2, path: child2 && `${child.path}/${child2.id}`}));
							if (CE(childChildren).Any(a=>a == null)) {
								// if (steps.length == 1 && steps[0].id == 'clDjK76mSsGXicwd7emriw') debugger;
								return null;
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
					markPathHideTime(path, time_abs);
				}
			}
		}

		if (effect.hide) {
			for (const path of CE(pathVisibilitiesSoFar).VKeys()) {
				if (path.startsWith(effect.path)) {
					markPathHideTime(path, time_abs);
				}
			}
		}
	}

	return {pathVisibilitiesSoFar, pathRevealTimes_first, pathRevealTimes_lastFresh};
});
export const GetVisiblePathRevealTimesAfterEffects = CreateAccessor((pathsRevealedAtStart: string[], effects: PlaybackEffect[], baseOn: "first reveal" | "last fresh reveal" = "last fresh reveal")=>{
	const states = GetPathVisibilityInfoAfterEffects(pathsRevealedAtStart, effects);
	if (states == null) return emptyArray_forLoading;
	const visiblePathsAtEnd = states.pathVisibilitiesSoFar.Pairs().filter(a=>a.value == true).map(a=>a.key);
	return visiblePathsAtEnd.ToMapObj(path=>path, path=>{
		if (baseOn == "first reveal") return states.pathRevealTimes_first[path];
		if (baseOn == "last fresh reveal") return states.pathRevealTimes_lastFresh[path];
		Assert(false, "Invalid baseOn value.");
	});
});
export const GetVisiblePathsAfterEffects = CreateAccessor((pathsRevealedAtStart: string[], effects: PlaybackEffect[])=>{
	return CE(GetVisiblePathRevealTimesAfterEffects(pathsRevealedAtStart, effects)).VKeys();
});

export const GetPathFocusLevelsAfterEffects = CreateAccessor((effects: PlaybackEffect[])=>{
	const pathFocusLevels = {} as {[key: string]: number};
	for (const stepEffect of effects) {
		const effect = stepEffect.nodeEffect;
		if (effect == null) continue;

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
	return pathFocusLevels;
});
export const GetPathsWith1PlusFocusLevelAfterEffects = CreateAccessor((effects: PlaybackEffect[])=>{
	return Object.entries(GetPathFocusLevelsAfterEffects(effects)).filter(a=>a[1] >= 1).map(a=>a[0]);
});