import Action from "../../../Frame/General/Action";
import {ACTSelectMapNode, ACTToggleMapNodeExpanded} from "../../../routes/@Shared/Maps/MapNodeUI";
import {FromJSON, ToJSON} from "../../../Frame/General/Globals";
import {GetTreeNodesInObjTree, GetTreeNodesInPath, VisitTreeNodesInPath, TreeNode} from "../../../Frame/V/V";
import {IsNumberString} from "../../../Frame/General/Types";
import {A, Assert} from "../../../Frame/General/Assert";

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

/*function GetNodeViewAtPath(rootNodeView: MapNodeView, path: string, createPathIfNotExisting = true) {
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
}*/

function MapViewReducer(state = new MapView(), action: Action<any>) {
	if (action.Is(ACTSelectMapNode)) {
		/*let newRootNodeView = FromJSON(ToJSON(state.rootNodeView)) as MapNodeView;
		let nodes = GetTreeNodesInObjTree(newRootNodeView);
		for (let pair of nodes) {
			if (pair.prop == "selected")
				pair.obj.selected = false;
		}
		let nodeView = GetNodeViewAtPath(newRootNodeView, action.payload.path, true);
		if (nodeView) // (might be clicking background)
			nodeView.selected = true;
		return {...state, rootNodeView: newRootNodeView};*/

		let nodes = GetTreeNodesInObjTree(state.rootNodeView, true);
		let selectedNode = nodes.FirstOrX(a=>a.Value.selected);
		//let rootNodeView_withDeselect = selectedNode ? CloneTreeDownToXWhileReplacingXValue(state.rootNodeView, selectedNode.PathStr + "/selected", false) : state.rootNodeView;
		let rootNodeView_withDeselect = selectedNode
			? VisitTreeNodesInPath({...state.rootNodeView}, selectedNode.PathNodes.concat(["selected"]), node=>node.Value = node.prop != "selected" ? {...node.Value} : false)
			: state.rootNodeView;
		if (action.payload.path == null)
			return {...state, rootNodeView: rootNodeView_withDeselect};


		let nodeToSelect_finalPath = action.payload.path.split("/").Skip(1).SelectMany((key, index)=>["children", key]);
		Assert(GetTreeNodesInPath(rootNodeView_withDeselect, nodeToSelect_finalPath.concat(["selected"])).Last().Value !== true,
			"Cannot dispatch select-node action for a node that's already selected.");
		//let rootNodeView_withSelect = CloneTreeDownToXWhileReplacingXValue(rootNodeView_withDeselect, nodeToSelect_finalPath + "/selected", true);
		let rootNodeView_withSelect = VisitTreeNodesInPath({...rootNodeView_withDeselect}, nodeToSelect_finalPath.concat(["selected"]), node=> {
			node.Value =
				IsNumberString(node.prop) ? {...node.Value || {children: {}}} :
				node.prop == "children" ? {...node.Value || {}} :
				//node.prop == "selected" ? true :
				(Assert(node.prop == "selected"), true);
		});
		return {...state, rootNodeView: rootNodeView_withSelect};
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