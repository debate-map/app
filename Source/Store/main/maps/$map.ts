import {GetNode} from "../../firebase/nodes";
import Action from "../../../Frame/General/Action";
import {MapInfo} from "./@MapInfo";
import {CombineReducers, emptyArray} from "../../../Frame/Store/ReducerUtils";
import {GetTimeline, GetTimelineStep} from "../../firebase/timelines";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import {TimelineStep} from "Store/firebase/timelineSteps/@TimelineStep";
import {GetMap} from "../../firebase/maps";

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

export const MapInfoReducer = CombineReducers({
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
export function GetPlayingTimelineAppliedStepShowNodes(mapID: number, excludeAfterCurrentStep = false): number[] {
	let map = GetMap(mapID);
	if (!map) return emptyArray;

	let appliedSteps = GetPlayingTimelineAppliedSteps(mapID, excludeAfterCurrentStep);
	let result = [];
	result.push(map.rootNode);
	for (let step of appliedSteps) {
		let showNodes = (step.nodesToShowStr || "").replace(/ /g, "").split(",").map(ToInt);
		for (let nodeID of showNodes) {
			if (result.Contains(nodeID)) continue;
			result.push(nodeID);
		}
	}
	return result;
}

export function GetPlayingTimelineSteps(mapID: number): TimelineStep[] {
	let playingTimeline = GetPlayingTimeline(mapID);
	if (playingTimeline == null) return emptyArray;
	let steps = playingTimeline.steps.map(a=>GetTimelineStep(a));
	if (steps.Any(a=>a == null)) return emptyArray;
	return steps;
}
export function GetPlayingTimelineShowableNodes(mapID: number, excludeAfterCurrentStep = false): number[] {
	let map = GetMap(mapID);
	if (!map) return emptyArray;

	let steps = GetPlayingTimelineSteps(mapID);
	let result = [];
	result.push(map.rootNode);
	for (let step of steps) {
		let showNodes = (step.nodesToShowStr || "").replace(/ /g, "").split(",").map(ToInt);
		for (let nodeID of showNodes) {
			if (result.Contains(nodeID)) continue;
			result.push(nodeID);
			// MS this also adds children, when option enabled
		}
	}
	return result;
}