import {Vector2i} from "../../Frame/General/VectorStructs";
import Action from "../../Frame/General/Action";
import {FromJSON, ToJSON} from "../../Frame/General/Globals";
import {GetTreeNodesInObjTree, GetTreeNodesInPath, VisitTreeNodesInPath, TreeNode} from "../../Frame/V/V";
import {IsNumberString} from "../../Frame/General/Types";
import {A, Assert} from "../../Frame/General/Assert";
import {MapViews, MapView, MapNodeView} from "./mapViews/@MapViews";
import {ToInt} from "../../../Source/Frame/General/Types";
import {GetMap} from "../firebase/maps";
import u from "updeep";
import {MapViewReducer} from "./mapViews/$mapView";

export class ACTMapNodeSelect extends Action<{mapID: number, path: string}> {}
export class ACTMapNodePanelOpen extends Action<{mapID: number, path: string, panel: string}> {}
export class ACTMapNodeExpandedSet extends Action<{mapID: number, path: string, expanded: boolean, recursive: boolean}> {}
export class ACTViewCenterChange extends Action<{mapID: number, focusNode: string, viewOffset: Vector2i}> {}

export function MapViewsReducer(state = new MapViews(), action: Action<any>) {
	if (action.type == "@@router/LOCATION_CHANGE" && action.payload.pathname == "/global")
		return {...state, 1: state[1] || new MapView()};

	let newState = {};
	let hasChanged = false;
	for (let key of state.VKeys()) {
		let newStateForKey = MapViewReducer(state[key], action);
		hasChanged = hasChanged || newStateForKey !== state[key];
		newState[key] = newStateForKey;
	}
	return hasChanged ? newState : state;
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
		return (parentNodeView.children || {})[pathNodeIDs.Last()];
	}

	let mapView = GetMapView(mapID);
	return mapView.rootNodeViews.VValues()[0] as MapNodeView;
}
export function GetFocusNode(mapView: MapView): string {
	let treeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "focus" && a.Value);
	if (treeNode == null) return null;
	let focusNodeView = treeNode.ancestorNodes.Last();

	let pathNodes = focusNodeView.PathNodes.Where(a=>a != "children");
	return pathNodes.join("/");
}
export function GetViewOffset(mapView: MapView): Vector2i {
	let treeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "viewOffset" && a.Value);
	return treeNode ? treeNode.Value : null;
}