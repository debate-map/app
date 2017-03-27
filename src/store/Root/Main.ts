import {CombineReducers, RootState} from "../Root";
import {MapViews, MapViewsReducer} from "./Main/MapViews";
import {combineReducers} from "redux";
import {firebaseStateReducer} from "react-redux-firebase";
import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions} from "../../Frame/UI/VMessageBox";
import Action from "../../Frame/General/Action";
import {routerReducer} from "react-router-redux";
import {ToJSON, FromJSON, Debugger} from "../../Frame/General/Globals";
import V from "../../Frame/V/V";
import {Map} from "../../routes/@Shared/Maps/Map";
import {createSelector} from "reselect";
import {FirebaseDatabase} from "../../Frame/UI/ReactGlobals";
import {GetTreeNodesInObjTree} from "../../Frame/V/V";

// state and actions
// ==========

// class is used only for initialization
export class MainState {
	userPanelOpen = false;
	ratingUI: RatingUIState;
	//ratingUI = new RatingUIState();

	openMap: number;
	mapViews = new MapViews();
	copiedNode: number;
}
export class ACTUserPanelOpenSet extends Action<boolean> {}
export class ACTNodeCopy extends Action<number> {}

// reducers
// ==========

let MainReducer_Real;
export function MainReducer(state, action) {
	MainReducer_Real = MainReducer_Real || CombineReducers({
		userPanelOpen: (state = false, action)=> {
			// cheats
			if (action.type == "@@reactReduxFirebase/SET" && action["data"]) {
				// turn annoying arrays into objects
				var treeNodes = GetTreeNodesInObjTree(action["data"], true);
				for (let treeNode of treeNodes) {
					if (treeNode.Value instanceof Array) {
						let objVersion = {}.Extend(treeNode.Value) as any;
						for (let key in objVersion) {
							// if fake array-item added by Firebase (just so it would be an array), remove it
							if (objVersion[key] == null)
								delete objVersion[key];
						}
						treeNode.obj[treeNode.prop] = objVersion;
					}
				}

				// add special _key or _id prop
				if (typeof action["data"] == "object") {
					let key = (action["path"] as string).split("/").Last();
					if (parseInt(key).toString() == key)
						action["data"]._id = parseInt(key);
					else
						action["data"]._key = key;
				}
			}

			//case SET_USER_PANEL_OPEN: return {...state, userPanelOpen: action.payload};
			if (action.Is(ACTUserPanelOpenSet))
				return action.payload;
			return state;
		},
		ratingUI: RatingUIReducer,
		openMap: (state = null, action)=> {
			if (action.type == "@@router/LOCATION_CHANGE" && action.payload.pathname == "/global")
				return 1;
			return state;
		},
		mapViews: MapViewsReducer,
		copiedNode: (state = null as number, action)=> {
			if (action.Is(ACTNodeCopy))
				return action.payload;
			return state;
		}
	});
	return MainReducer_Real(state, action);
}

export class RatingUIState {
	smoothing = 5;
}
export class ACTRatingUISmoothnessSet extends Action<number> {}

export function RatingUIReducer(state = new RatingUIState(), action: Action<any>): RatingUIState {
	if (action.Is(ACTRatingUISmoothnessSet))
		return {...state, smoothing: action.payload};
	return state;
}

// selectors
// ==========

export function GetRatingUISmoothing(state: RootState) { 
	return state.main.ratingUI.smoothing;
}
export function GetSelectedNodeID(state: RootState, {map}: {map: Map}) { 
	let mapView = state.main.mapViews[map._id];
	let selectedNodeView = GetTreeNodesInObjTree(mapView).FirstOrX(a=>a.prop == "selected" && a.Value);
	if (selectedNodeView && selectedNodeView.ancestorNodes.Last().prop == "rootNodeView")
		return map.rootNode;
	return selectedNodeView ? selectedNodeView.ancestorNodes.Last().prop as number : null;
}
export function GetMapView(state: RootState, {map}: {map: Map}) {
	if (map == null) return null;
	return state.main.mapViews[map._id];
}
export function MakeGetNodeView() {
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
			return currentNodeView;*/
			return parentNodeView && parentNodeView.children ? parentNodeView.children[pathNodeIDs.Last()] : rootNodeView;
		}
  	);
}