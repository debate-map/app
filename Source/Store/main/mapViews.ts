import {Vector2i} from "../../Frame/General/VectorStructs";
import Action from "../../Frame/General/Action";
import {FromJSON, ToJSON} from "../../Frame/General/Globals";
import {GetTreeNodesInObjTree, GetTreeNodesInPath, VisitTreeNodesInPath, TreeNode} from "../../Frame/V/V";
import {IsNumberString} from "../../Frame/General/Types";
import {A, Assert} from "../../Frame/General/Assert";
import {MapViews, MapView, MapNodeView} from "./mapViews/@MapViews";
import {ToInt} from "../../Frame/General/Types";
import {GetMap, GetRootNodeID} from "../firebase/maps";
import u from "updeep";
import {MapViewReducer, ACTMapViewMerge} from "./mapViews/$mapView";
import {ShallowChanged} from "../../Frame/UI/ReactGlobals";
import {DBPath} from "../../Frame/Database/DatabaseHelpers";
import {CreateDemoMapView} from "../../UI/Home/Home";
import {URL} from "../../Frame/General/URLs";

export function MapViewsReducer(state = new MapViews(), action: Action<any>) {
	/*if (action.Is(ACTOpenMapSet))
		return {...state, [action.payload]: state[action.payload] || new MapView()};*/

	let newState = {...state};

	// if demo map-view not added, add it (I know... this is not the best way... :-| )
	if (newState[-100] == null)
		newState[-100] = CreateDemoMapView();
	if (action.type == "@@reactReduxFirebase/SET" && action["data"]) {
		let match = action["path"].match("^" + DBPath("maps") + "/([0-9]+)");
		// if map-data was just loaded
		if (match) {
			let mapID = parseInt(match[1]);
			// and no map-view exists for it yet, create one (by expanding root-node, and changing focus-node/view-offset)
			//if (GetMapView(mapID) == null) {
			//if (state[mapID].rootNodeViews.VKeys().length == 0) {
			if (newState[mapID] == null) {
				newState[mapID] = {
					rootNodeViews: {
						[action["data"].rootNode]: new MapNodeView().VSet({expanded: true, focus: true, viewOffset: new Vector2i(200, 0)})
					}
				};
			}
		}
	}
	/*if (action.type == "@@router/LOCATION_CHANGE" && URL.FromState(action.payload).pathNodes[0] == "global") {
		let mapID = 1, rootNode = 1;
		// if no map-view exists for it yet, create one (by expanding root-node, and changing focus-node/view-offset)
		if (newState[mapID] == null) {
			newState[mapID] = {
				rootNodeViews: {
					[rootNode]: new MapNodeView().VSet({expanded: true, focus: true, viewOffset: new Vector2i(200, 0)})
				}
			};
		}
	}*/
	if (action.Is(ACTMapViewMerge)) {
		if (newState[action.payload.mapID] == null) {
			newState[action.payload.mapID] = action.payload.mapView;
		}
	}

	for (let key in newState) {
		newState[key] = MapViewReducer(newState[key], action, parseInt(key));
	}
	return ShallowChanged(newState, state) ? newState : state;
}

// selectors
// ==========

export function GetSelectedNodePathNodes(mapID: number): number[] {
	let mapView = GetMapView(mapID);
	let selectedTreeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "selected" && a.Value);
	if (selectedTreeNode == null) return [];
	let selectedNodeView = selectedTreeNode.ancestorNodes.Last();

	return selectedNodeView.PathNodes.Where(a=>a != "children").map(ToInt);
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
			if (!props.path.Contains("/")) return null;
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
	if (mapView == null) return null;
	return mapView.rootNodeViews[pathNodeIDs[0]] as MapNodeView;
}
export function GetFocusNode(mapView: MapView): string {
	if (mapView == null) return null;
	let treeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "focus" && a.Value);
	if (treeNode == null) return null;
	let focusNodeView = treeNode.ancestorNodes.Last();

	let pathNodes = focusNodeView.PathNodes.Where(a=>a != "children");
	return pathNodes.join("/");
}
export function GetViewOffset(mapView: MapView): Vector2i {
	if (mapView == null) return null;
	let treeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "viewOffset" && a.Value);
	return treeNode ? treeNode.Value : null;
}