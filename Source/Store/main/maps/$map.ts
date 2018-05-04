import {GetNode, GetNodeChildren} from "../../firebase/nodes";
import Action from "../../../Frame/General/Action";
import {MapInfo} from "./@MapInfo";
import {CombineReducers, emptyArray} from "../../../Frame/Store/ReducerUtils";
import {GetTimeline, GetTimelineStep} from "../../firebase/timelines";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import {TimelineStep} from "Store/firebase/timelineSteps/@TimelineStep";
import {GetMap} from "../../firebase/maps";
import {ShowChangesSinceType} from "Store/main/maps/@MapInfo";
import { SimpleReducer } from "Store";
import {GetValues} from "Frame/General/Enums";

export enum SortType {
	CreatorID = 10,
	CreationDate = 20,
	//UpdateDate = 30,
	//ViewerCount = 40,
}

export class ACTMapNodeListSortBySet extends Action<{mapID: number, sortBy: SortType}> {}
export class ACTMapNodeListFilterSet extends Action<{mapID: number, filter: string}> {}
export class ACTMapNodeListPageSet extends Action<{mapID: number, page: number}> {}
export class ACTSelectedNode_InListSet extends Action<{mapID: number, nodeID: number}> {}
export class ACTMap_List_SelectedNode_OpenPanelSet extends Action<{mapID: number, panel: string}> {}
export class ACTMap_SelectedTimelineSet extends Action<{mapID: number, selectedTimeline: number}> {}
export class ACTMap_PlayingTimelineSet extends Action<{mapID: number, timelineID: number}> {}
export class ACTMap_PlayingTimelineStepSet extends Action<{mapID: number, step: number}> {}
export class ACTMap_PlayingTimelineAppliedStepSet extends Action<{mapID: number, step: number}> {}

/*export function MapInfoReducer(state = null, action: Action<any>, mapID: number): MapInfo {
	if (action.Is(ACTSelectedNode_InListSet)) return {...state, list_selectedNodeID: action.payload.nodeID};
	return state;
}*/

export const MapInfoReducer = mapID=>CombineReducers({
	list_sortBy: (state = SortType.CreationDate, action)=> {
		if (action.Is(ACTMapNodeListSortBySet)) return action.payload.sortBy;
		return state;
	},
	list_filter: (state = "", action)=> {
		if (action.Is(ACTMapNodeListFilterSet)) return action.payload.filter;
		return state;
	},
	list_page: (state = 0, action)=> {
		if (action.Is(ACTMapNodeListPageSet)) return action.payload.page;
		return state;
	},

	list_selectedNodeID: (state = null, action)=> {
		if (action.Is(ACTSelectedNode_InListSet)) return action.payload.nodeID;
		return state;
	},
	list_selectedNode_openPanel: (state = null, action)=> {
		if (action.Is(ACTMap_List_SelectedNode_OpenPanelSet)) return action.payload.panel;
		return state;
	},
	selectedTimeline: (state = null, action)=> {
		if (action.Is(ACTMap_SelectedTimelineSet)) return action.payload.selectedTimeline;
		return state;
	},
	playingTimeline: (state = null, action)=> {
		if (action.Is(ACTMap_PlayingTimelineSet)) return action.payload.timelineID;
		return state;
	},
	playingTimeline_step: (state = null, action)=> {
		if (action.Is(ACTMap_PlayingTimelineStepSet)) return action.payload.step;
		return state;
	},
	playingTimeline_appliedStep: (state = null, action)=> {
		if (action.Is(ACTMap_PlayingTimelineAppliedStepSet)) return action.payload.step;
		return state;
	},

	showChangesSince_type: SimpleReducer(`main/maps/${mapID}/showChangesSince_type`, ShowChangesSinceType.SinceVisitX),
	showChangesSince_visitOffset: SimpleReducer(`main/maps/${mapID}/showChangesSince_visitOffset`, 1),
});

export function GetSelectedNodeID_InList(mapID: number) {
	return State("main", "maps", mapID, "list_selectedNodeID");
}
export function GetSelectedNode_InList(mapID: number) {
	let nodeID = GetSelectedNodeID_InList(mapID);
	return GetNode(nodeID);
}

export function GetMap_List_SelectedNode_OpenPanel(mapID: number) {
	return State("main", "maps", mapID, "list_selectedNode_openPanel");
}

export function GetPlayingTimeline(mapID: number): Timeline {
	if (mapID == null) return null;
	let timelineID = State("main", "maps", mapID, "playingTimeline");
	return GetTimeline(timelineID);
}
export function GetPlayingTimelineStepIndex(mapID: number): number {
	if (mapID == null) return null;
	return State("main", "maps", mapID, "playingTimeline_step");
}
export function GetPlayingTimelineStep(mapID: number) {
	let playingTimeline = GetPlayingTimeline(mapID);
	if (playingTimeline == null) return null;
	let stepIndex = GetPlayingTimelineStepIndex(mapID) || 0;
	let stepID = playingTimeline.steps[stepIndex];
	return GetTimelineStep(stepID);
}
export function GetPlayingTimelineCurrentStepRevealNodes(mapID: number): string[] {
	let playingTimeline_currentStep = GetPlayingTimelineStep(mapID);
	if (playingTimeline_currentStep == null) return emptyArray;
	return GetNodesRevealedInSteps([playingTimeline_currentStep]);
}

export function GetPlayingTimelineAppliedStepIndex(mapID: number): number {
	if (mapID == null) return null;
	return State("main", "maps", mapID, "playingTimeline_appliedStep");
}
export function GetPlayingTimelineAppliedSteps(mapID: number, excludeAfterCurrentStep = false): TimelineStep[] {
	let playingTimeline = GetPlayingTimeline(mapID);
	if (playingTimeline == null) return emptyArray;
	let stepIndex = GetPlayingTimelineAppliedStepIndex(mapID) || -1;
	if (excludeAfterCurrentStep) {
		let currentStep = GetPlayingTimelineStepIndex(mapID);
		stepIndex = Math.min(currentStep, stepIndex);
	}
	let stepIDs = playingTimeline.steps.slice(0, stepIndex + 1)
	let steps = stepIDs.map(a=>GetTimelineStep(a));
	if (steps.Any(a=>a == null)) return emptyArray;
	return steps;
}
export function GetPlayingTimelineAppliedStepRevealNodes(mapID: number, excludeAfterCurrentStep = false): string[] {
	let map = GetMap(mapID);
	if (!map) return emptyArray;

	let appliedSteps = GetPlayingTimelineAppliedSteps(mapID, excludeAfterCurrentStep);
	return [map.rootNode+""].concat(GetNodesRevealedInSteps(appliedSteps));
}

export function GetPlayingTimelineSteps(mapID: number): TimelineStep[] {
	let playingTimeline = GetPlayingTimeline(mapID);
	if (playingTimeline == null) return emptyArray;
	let steps = playingTimeline.steps.map(a=>GetTimelineStep(a));
	if (steps.Any(a=>a == null)) return emptyArray;
	return steps;
}
export function GetNodesRevealedInSteps(steps: TimelineStep[]): string[] {
	let result = {};
	for (let step of steps) {
		for (let reveal of step.nodeReveals || []) {
			result[reveal.path] = true;
			let node = GetNode(reveal.path.split("/").Last().ToInt());
			if (node == null) continue;
			let currentChildren = GetNodeChildren(node).map(child=>({node: child, path: child && `${reveal.path}/${child._id}`}));
			if (currentChildren.Any(a=>a.node == null)) return emptyArray;

			for (var childrenDepth = 1; childrenDepth <= reveal.revealDepth; childrenDepth++) {
				let nextChildren = [];
				for (let child of currentChildren) {
					result[child.path] = true;
					// if there's another loop/depth after this one
					if (childrenDepth < reveal.revealDepth) {
						let childChildren = GetNodeChildren(child.node).map(child2=>({node: child2, path: child2 && `${child.path}/${child2._id}`}));
						if (childChildren.Any(a=>a == null)) return emptyArray;
						nextChildren.AddRange(childChildren);
					}
				}
				currentChildren = nextChildren;
			}
		}
	}
	return result.VKeys();
}
export function GetPlayingTimelineRevealNodes(mapID: number, excludeAfterCurrentStep = false): string[] {
	let map = GetMap(mapID);
	if (!map) return emptyArray;

	let steps = GetPlayingTimelineSteps(mapID);
	return [map.rootNode+""].concat(GetNodesRevealedInSteps(steps));
}

export function GetTimeFromWhichToShowChangedNodes(mapID: number) {
	let type = State(`main/maps/${mapID}/showChangesSince_type`) as ShowChangesSinceType;
	if (type == ShowChangesSinceType.None) return Number.MAX_SAFE_INTEGER; // from end of time (nothing)
	if (type == ShowChangesSinceType.AllUnseenChanges) return 0; // from start of time (everything)
	if (PROD && !GetValues(ShowChangesSinceType).Contains(type)) return Number.MAX_SAFE_INTEGER; // defensive

	let visitOffset = State(`main/maps/${mapID}/showChangesSince_visitOffset`) as number;
	let lastMapViewTimes = FromJSON(localStorage.getItem("lastMapViewTimes_" + mapID) || "[]") as number[];
	if (lastMapViewTimes.length == 0) return Number.MAX_SAFE_INTEGER; // our first visit, so don't show anything

	let timeOfSpecifiedVisit = lastMapViewTimes[visitOffset.KeepAtMost(lastMapViewTimes.length - 1)];
	return timeOfSpecifiedVisit;
}