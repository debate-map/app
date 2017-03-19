import Action from "../../../Frame/General/Action";
import {ACTSelectMapNode, ACTToggleMapNodeExpanded} from "../../../routes/@Shared/Maps/MapNodeUI";
import {FromJSON, ToJSON} from "../../../Frame/General/Globals";
import V from "../../../Frame/V/V";

export class MapViews {
	[key: number]: MapView;
}
export class MapView {
	rootNodeView = new MapNodeView();
}
export class MapNodeView {
	expanded?: boolean;
	selected?: boolean;
	children = {} as {[key: string]: MapNodeView};
}

export function MapViewsReducer(state = new MapViews(), action: Action<any>) {
	if (action.type == "@@router/LOCATION_CHANGE" && action.payload.pathname == "/global")
		return {
			...state,
			1: state[1] || new MapView(),
		};
	if (action.Is(ACTSelectMapNode))
		return {
			...state,
			[action.payload.mapID]: MapViewReducer(state[action.payload.mapID], action),
		};
	if (action.Is(ACTToggleMapNodeExpanded))
		return {
			...state,
			[action.payload.mapID]: MapViewReducer(state[action.payload.mapID], action),
		};
	return state;
}

function GetNodeViewAtPath(rootNodeView: MapNodeView, path: string, createPathIfNotExisting = true) {
	if (!path) return null;
	let pathNodeIDs = path.split("/").Select(a=>parseInt(a));
	let newRootNodeView_currentNode = rootNodeView;
	for (let nodeID of pathNodeIDs.Skip(1)) {
		if (newRootNodeView_currentNode.children[nodeID] == null) {
			if (createPathIfNotExisting)
				newRootNodeView_currentNode.children[nodeID] = {children: {}};
			else
				return null;
		}
		newRootNodeView_currentNode = newRootNodeView_currentNode.children[nodeID];
	}
	return newRootNodeView_currentNode;
}

function MapViewReducer(state = new MapView(), action: Action<any>) {
	if (action.Is(ACTSelectMapNode)) {
		let newRootNodeView = FromJSON(ToJSON(state.rootNodeView)) as MapNodeView;
		let pairs = V.GetKeyValuePairsInObjTree(newRootNodeView);
		for (let pair of pairs) {
			if (pair.prop == "selected")
				pair.obj.selected = false;
		}
		let nodeView = GetNodeViewAtPath(newRootNodeView, action.payload.path, true);
		if (nodeView) // (might be clicking background)
			nodeView.selected = true;
		return {...state, rootNodeView: newRootNodeView};
	}
	if (action.Is(ACTToggleMapNodeExpanded)) {
		/*let newRootNodeView = FromJSON(ToJSON(state.rootNodeView)) as MapNodeView;
		let nodeView = GetNodeViewAtPath(newRootNodeView, action.payload.path, true);
		nodeView.expanded = !nodeView.expanded;
		return {
			...state,
			rootNodeView: newRootNodeView,
		};*/
		//let newRootNodeView = {...state.rootNodeView};
		let newRootNodeView_2 = state.rootNodeView.Extended({});
		let path = action.payload.path;
		let pathNodeIDs = path.split("/").Select(a=>parseInt(a));

		let currentNodeInNewTree = newRootNodeView_2;
		for (let nodeID of pathNodeIDs.Skip(1))
			currentNodeInNewTree = currentNodeInNewTree.children[nodeID] = {...(currentNodeInNewTree.children[nodeID] || {children: {}})};
		currentNodeInNewTree.expanded = !currentNodeInNewTree.expanded;
		return {...state, rootNodeView: newRootNodeView_2};
	}
	return state;
}