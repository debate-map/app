import {Vector2i} from "../../Frame/General/VectorStructs";
import Action from "../../Frame/General/Action";
import {FromJSON, ToJSON} from "../../Frame/General/Globals";
import {GetTreeNodesInObjTree, GetTreeNodesInPath, VisitTreeNodesInPath, TreeNode} from "../../Frame/V/V";
import {IsNumberString} from "../../Frame/General/Types";
import {A, Assert} from "../../Frame/General/Assert";
import {MapViews, MapView} from "./mapViews/@MapViews";
import {MapNodeView} from "../main/mapViews/@MapViews";
import {ToInt} from "../../../Source/Frame/General/Types";
import {GetMap} from "../firebase/maps";

export class ACTMapNodeSelect extends Action<{mapID: number, path: string}> {}
export class ACTMapNodePanelOpen extends Action<{mapID: number, path: string, panel: string}> {}
export class ACTMapNodeExpandedToggle extends Action<{mapID: number, path: string}> {}
export class ACTViewCenterChange extends Action<{mapID: number, focusNode: string, viewOffset: Vector2i}> {}

export function MapViewsReducer(state = new MapViews(), action: Action<any>) {
	if (action.type == "@@router/LOCATION_CHANGE" && action.payload.pathname == "/global")
		return {...state, 1: state[1] || new MapView()};
	if (action.Is(ACTMapNodeSelect))
		return {...state, [action.payload.mapID]: MapViewReducer(state[action.payload.mapID], action)};
	if (action.Is(ACTMapNodePanelOpen))
		return {...state, [action.payload.mapID]: MapViewReducer(state[action.payload.mapID], action)};
	if (action.Is(ACTMapNodeExpandedToggle))
		return {...state, [action.payload.mapID]: MapViewReducer(state[action.payload.mapID], action)};
	if (action.Is(ACTViewCenterChange))
		return {...state, [action.payload.mapID]: MapViewReducer(state[action.payload.mapID], action)};
	return state;
}

function MapViewReducer(state = new MapView(), action: Action<any>) {
	if (action.Is(ACTMapNodeSelect)) {
		let nodes = GetTreeNodesInObjTree(state.rootNodeView, true);
		let selectedNode = nodes.FirstOrX(a=>a.Value && a.Value.selected);
		let rootNodeView_withClosePanel = selectedNode == null ? state.rootNodeView
			: VisitTreeNodesInPath({...state.rootNodeView}, selectedNode.PathNodes.concat(["openPanel"]), node=>node.Value = node.prop == "openPanel" ? null : {...node.Value});
		let rootNodeView_withDeselect = selectedNode == null ? rootNodeView_withClosePanel
			: VisitTreeNodesInPath({...rootNodeView_withClosePanel}, selectedNode.PathNodes.concat(["selected"]), node=>node.Value = node.prop == "selected" ? false : {...node.Value});
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
	if (action.Is(ACTMapNodePanelOpen)) {
		let nodeToSelect_finalPath = action.payload.path.split("/").Skip(1).SelectMany((key, index)=>["children", key]);
		let rootNodeView_withOpenPanel = VisitTreeNodesInPath({...state.rootNodeView}, nodeToSelect_finalPath.concat(["openPanel"]), node=> {
			node.Value =
				IsNumberString(node.prop) ? {...node.Value || {children: {}}} :
				node.prop == "children" ? {...node.Value || {}} :
				(Assert(node.prop == "openPanel"), action.payload.panel);
		});
		return {...state, rootNodeView: rootNodeView_withOpenPanel};
	}
	if (action.Is(ACTMapNodeExpandedToggle)) {
		let newRootNodeView_2 = state.rootNodeView.Extended({});
		let path = action.payload.path;
		let pathNodeIDs = path.split("/").Select(a=>parseInt(a));

		let currentNodeInNewTree = newRootNodeView_2;
		for (let nodeID of pathNodeIDs.Skip(1))
			currentNodeInNewTree = currentNodeInNewTree.children[nodeID] = {...(currentNodeInNewTree.children[nodeID] || {children: {}})};
		currentNodeInNewTree.expanded = !currentNodeInNewTree.expanded;
		return {...state, rootNodeView: newRootNodeView_2};
	}
	if (action.Is(ACTViewCenterChange))
		return {...state, focusNode: action.payload.focusNode, viewOffset: action.payload.viewOffset};
	return state;
}

// selectors
// ==========

export function GetSelectedNodePathNodes(mapID: number): number[] {
	let mapView = GetMapView(mapID);
	let selectedTreeNode = GetTreeNodesInObjTree(mapView).FirstOrX(a=>a.prop == "selected" && a.Value);
	if (selectedTreeNode == null) return [];
	let selectedNodeView = selectedTreeNode.ancestorNodes.Last();

	let map = GetMap(mapID);
	if (map == null) return [];

	let pathNodes = selectedNodeView.PathNodes.Where(a=>a != "children");
	pathNodes[0] = map.rootNode.toString();
	return pathNodes.map(ToInt);
}
export function GetSelectedNodePath(mapID: number): string {
	return GetSelectedNodePathNodes(mapID).join("/");
}
export function GetSelectedNodeID(mapID: number): number {
	/*let mapView = GetMapView(mapID);
	let selectedNodeView = GetTreeNodesInObjTree(mapView).FirstOrX(a=>a.prop == "selected" && a.Value);
	if (selectedNodeView && selectedNodeView.ancestorNodes.Last().prop == "rootNodeView")
		return GetMap(mapID).rootNode;
	return selectedNodeView ? selectedNodeView.ancestorNodes.Last().prop as number : null;*/
	return GetSelectedNodePathNodes(mapID).LastOrX();
}
/*export function MakeGetNodeView() {
	var getParentNodeView; //= MakeGetNodeView();
	return createSelector(
		(_, {firebase}: {firebase: FirebaseDatabase})=>firebase,
		(_, {map}: {map: Map})=>map._id,
		(state: RootState, {map})=>state.main.mapViews[map._id] && state.main.mapViews[map._id].rootNodeView,
		(_, {path}: {path: string})=>path,
		(state: RootState, props)=> {
			let {path, ...rest} = props;
			if (!props.path.contains("/")) return null;
			getParentNodeView = getParentNodeView || MakeGetNodeView();
			return getParentNodeView(state, {...rest, path: path.substring(0, path.lastIndexOf("/"))});
		},
		(firebase, mapID, rootNodeView, path, parentNodeView) => {
			if (mapID == null || path == null) return null;
			let pathNodeIDs = path.split("/").Select(a=>parseInt(a));
			/*var currentNodeView = mapView.rootNodeView || {children: {}};
			for (let [index, nodeID] of pathNodeIDs.Skip(1).entries()) {
				currentNodeView = currentNodeView.children[nodeID];
				if (currentNodeView == null)
					return null;
			}
			return currentNodeView;*#/
			return parentNodeView && parentNodeView.children ? parentNodeView.children[pathNodeIDs.Last()] : rootNodeView;
		}
  	);
}*/
export function GetMapView(mapID: number): MapView {
	return State().main.mapViews[mapID];
}
export function GetNodeView(mapID: number, path: string): MapNodeView {
	let pathNodeIDs = path.split("/").map(ToInt);
	let parentNodeID = pathNodeIDs.length > 1 ? pathNodeIDs.XFromLast(1) : null;
	if (parentNodeID) {
		//let parentNodeView = CachedTransform({mapID, path}, )
		let parentNodeView = GetNodeView(mapID, path.substr(0, path.lastIndexOf("/")));
		return parentNodeView.children[pathNodeIDs.Last()];
	}

	let mapView = GetMapView(mapID);
	return mapView.rootNodeView;
}