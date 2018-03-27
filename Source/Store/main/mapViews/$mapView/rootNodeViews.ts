import {MapNodeView, MapView} from "../@MapViews";
import Action from "../../../../Frame/General/Action";
import u from "updeep";
import {RootNodeViews} from "./rootNodeViews/@RootNodeViews";
import {GetViewOffsetForNodeBox, GetNodeBoxForPath} from "../../../../UI/@Shared/Maps/MapUI";
import {Vector2i, GetTreeNodesInObjTree} from "js-vextensions";
import { GetPathNodes, GetNodeViewDataPath } from "../../mapViews";
import {SplitStringBySlash_Cached} from "../../../../Frame/Database/StringSplitCache";

export class ACTMapNodeSelect extends Action<{mapID: number, path: string}> {}
export class ACTMapNodePanelOpen extends Action<{mapID: number, path: string, panel: string}> {}
export class ACTMapNodeExpandedSet extends Action<{
	mapID: number, path: string, recursive: boolean
	expanded?: boolean, expanded_truth?: boolean, expanded_relevance?: boolean
}> {}
export class ACTMapNodeChildLimitSet extends Action<{mapID: number, path: string, direction: "down" | "up", value: number}> {}
export class ACTMapNodeTermOpen extends Action<{mapID: number, path: string, termID: number}> {}

export class ACTViewCenterChange extends Action<{mapID: number, focusNodePath: string, viewOffset: Vector2i}> {}

export function RootNodeViewsReducer(state = new RootNodeViews(), action: Action<any>, mapID: number) {
	// for performance reasons, we do portions of some actions "at the root", instead of using the descendant reducers
	// ==========

	// if we're selecting a new node, at-root deselect the old selected node
	if (action.Is(ACTMapNodeSelect)) {
		let nodes = GetTreeNodesInObjTree(state, true);

		let selectedNode = nodes.FirstOrX(a=>a.Value && a.Value.selected);
		if (selectedNode) {
			state = u.updateIn(selectedNode.PathStr_Updeep, u.omit(["selected", "openPanel"]), state);
		}

		//if (action.payload.path == null) return state;
	}

	// if we're focusing a new node, at-root unfocus the old focused node
	if (action.Is(ACTViewCenterChange) && action.payload.mapID == mapID) {
		let nodes = GetTreeNodesInObjTree(state, true);
		let focusNode = nodes.FirstOrX(a=>a.Value && a.Value.focused);
		if (focusNode) {
			state = u.updateIn(focusNode.PathStr_Updeep, u.omit(["focused", "viewOffset"]), state);
		}
	}

	// regular (branching) reducer portion
	// ==========

	//if (action.Is(ACTMapNodeSelect) && action.payload.mapID == mapID) {
	if (action.IsAny(ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeTermOpen, ACTMapNodeExpandedSet,
			ACTMapNodeChildLimitSet, ACTViewCenterChange) && action.payload.mapID == mapID) {
		let targetPath = GetTargetPath(action);
		if (targetPath) {
			let rootNodeID = SplitStringBySlash_Cached(targetPath)[0];
			state = {...state, [rootNodeID]: MapNodeViewReducer(state[rootNodeID], action, rootNodeID+"")};
		}
	}

	return state;
}

function GetTargetPath(action: Action<any>) {
	return action.Is(ACTViewCenterChange) ? action.payload.focusNodePath : action.payload.path;
}

function MapNodeViewReducer(state = new MapNodeView(), action: Action<any>, pathSoFar: string) {
	let targetPath = GetTargetPath(action);
	let atTargetNode = targetPath == pathSoFar;
	let pastTargetNode = pathSoFar.length > targetPath.length;

	if (!atTargetNode && !pastTargetNode) {
		let nextNodeIDInPath = SplitStringBySlash_Cached(targetPath.substr(pathSoFar.length + 1))[0];
		//return u.updateIn(`children.${nextNodeIDInPath}`, MapNodeViewReducer(state.children[nextNodeIDInPath], action, `${pathSoFar}/${nextNodeIDInPath}`), state);
		return {...state, children: {...state.children, [nextNodeIDInPath]: MapNodeViewReducer(state.children[nextNodeIDInPath], action, `${pathSoFar}/${nextNodeIDInPath}`)}};
	}

	if (action.Is(ACTMapNodeSelect)) {
		state = {...state, selected: true};
	} else if (action.Is(ACTMapNodePanelOpen)) {
		state = {...state, openPanel: action.payload.panel};
	} else if (action.Is(ACTMapNodeTermOpen)) {
		state = {...state, openTermID: action.payload.termID};
	} else if (action.Is(ACTMapNodeExpandedSet)) {
		let expandKey = ["expanded", "expanded_truth", "expanded_relevance"].find(key=>action.payload[key] != null);
		if (atTargetNode) {
			state = {...state, [expandKey]: action.payload[expandKey]};
		} else { // if past target-node
			state = {...state, expanded: false, expanded_truth: false, expanded_relevance: false};
		}

		if (action.payload.recursive) {
			state.children = {...state.children};
			for (let childID in state.children) {
				state.children[childID] = MapNodeViewReducer(state.children[childID], action, `${pathSoFar}/${childID}`);
			}
		}
	} else if (action.Is(ACTMapNodeChildLimitSet)) {
		state = {...state, [`childLimit_${action.payload.direction}`]: action.payload.value};
	} else if (action.Is(ACTViewCenterChange)) {
		state = {...state, focused: true, viewOffset: action.payload.viewOffset};
	}

	return state;
}