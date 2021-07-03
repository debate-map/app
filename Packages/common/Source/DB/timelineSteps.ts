import {emptyArray, ToNumber, emptyArray_forLoading, CE} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {Timeline} from "./timelines/@Timeline.js";
import {TimelineStep} from "./timelineSteps/@TimelineStep.js";
import {GetNode, GetNodeChildren} from "./nodes.js";

export const GetTimelineStep = CreateAccessor(c=>(id: string): TimelineStep|n=>{
	if (id == null) return null;
	//return GetDoc({}, a=>a.timelineSteps.get(id));
	return null;
});
export const GetTimelineSteps = CreateAccessor(c=>(timeline: Timeline, allowPartial = false): (TimelineStep|n)[]=>{
	return timeline.steps?.map(id=>GetTimelineStep[allowPartial ? "normal" : "BIN"](id)) ?? [];
});

export const GetNodeRevealTimesInSteps = CreateAccessor(c=>(steps: TimelineStep[], baseOnLastReveal = false)=>{
	const nodeRevealTimes = {} as {[key: string]: number};
	for (const [index, step] of steps.entries()) {
		for (const reveal of step.nodeReveals || []) {
			if (reveal.show) {
				const stepTime_safe = (step.videoTime != null ? step.videoTime : CE(steps.slice(0, index).map(a=>a.videoTime)).LastOrX(a=>a != null)) ?? 0;
				if (baseOnLastReveal) {
					nodeRevealTimes[reveal.path] = Math.max(stepTime_safe, ToNumber(nodeRevealTimes[reveal.path], 0));
				} else {
					nodeRevealTimes[reveal.path] = Math.min(stepTime_safe, ToNumber(nodeRevealTimes[reveal.path], Number.MAX_SAFE_INTEGER));
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
								nodeRevealTimes[child.path] = Math.max(stepTime_safe, ToNumber(nodeRevealTimes[child.path], 0));
							} else {
								nodeRevealTimes[child.path] = Math.min(stepTime_safe, ToNumber(nodeRevealTimes[child.path], Number.MAX_SAFE_INTEGER));
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
				for (const path of CE(nodeRevealTimes).VKeys()) {
					if (path.startsWith(reveal.path)) {
						delete nodeRevealTimes[path];
					}
				}
			}
		}
	}
	return nodeRevealTimes;
});
export const GetNodesRevealedInSteps = CreateAccessor(c=>(steps: TimelineStep[])=>{
	return CE(GetNodeRevealTimesInSteps(steps)).VKeys();
});