import {Map} from "../routes/@Shared/Maps/Map";
import {combineReducers} from "redux";
import {firebaseStateReducer, helpers} from "react-redux-firebase";
import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions, MessageBoxReducer, MessageBoxState} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {routerReducer} from "react-router-redux";
import {ToJSON, FromJSON} from "../Frame/General/Globals";
import V from "../Frame/V/V";
import {MainState, MainReducer} from "./Store/Main";
import {createSelector} from "reselect";
import {DBPath, GetData} from "../Frame/Database/DatabaseHelpers";
import {firebase} from "../config.js";
import {MapView} from "./Store/Main/MapViews";
import {MapNode} from "../routes/@Shared/Maps/MapNode";
import {FirebaseDatabase} from "../Frame/UI/ReactGlobals";
import {QuickIncrement, Debugger} from "../Frame/General/Globals_Free";
import {GetTreeNodesInObjTree} from "../Frame/V/V";
import {Set} from "immutable";
import {RatingType} from "../routes/@Shared/Maps/MapNode/RatingsUI";

export function InjectReducer(store, {key, reducer}) {
	store.asyncReducers[key] = reducer;
	store.replaceReducer(MakeRootReducer(store.asyncReducers));
}

export function CombineReducers(reducerMap: {[key: string]: (state, action: Action<any>)=>any}) {
	return combineReducers(reducerMap);
}

// class is used only for initialization
export class RootState {
	main: MainState;
	firebase: any;
	form: any;
	router: any;
	messageBox: MessageBoxState;
}
export function MakeRootReducer(asyncReducers?) {
	return combineReducers({
		main: MainReducer,
		firebase: firebaseStateReducer,
		form: formReducer,
		router: routerReducer,
		messageBox: MessageBoxReducer,
		...asyncReducers
	});
}

/*export function GetAuth(state: RootState) { 
	return state.firebase.auth;
}*/
export function GetRatingUISmoothing(state: RootState) { 
	return state.main.ratingUI.smoothing;
}

export function GetUserID(state: RootState): string { 
	//return state.firebase.data.auth ? state.firebase.data.auth.uid : null;
	//return GetData(state.firebase, "auth");
	/*var result = helpers.pathToJS(firebase, "auth").uid;
	return result;*/
	let firebaseSet = store.getState().firebase as Set<any>;
	return firebaseSet.toJS().auth.uid;
}

export function GetSelectedNodeID(state: RootState, {map}: {map: Map}) { 
	let mapView = state.main.mapViews[map._key.KeyToInt];
	let selectedNodeView = GetTreeNodesInObjTree(mapView).FirstOrX(a=>a.prop == "selected" && a.Value);
	if (selectedNodeView && selectedNodeView.ancestorNodes.Last().prop == "rootNodeView")
		return map.rootNode.KeyToInt;
	return selectedNodeView ? selectedNodeView.ancestorNodes.Last().prop as number : null;
}
/*export function GetPaths_Nodes({nodeIDs}: {nodeIDs: number[]}) {
	return nodeIDs.Select(a=>DBPath(`nodes/e${a}`));
}*/

function GetMapView(state: RootState, {map}: {map: Map}) {
	if (map == null) return null;
	return state.main.mapViews[map._key.KeyToInt];
}

export function MakeGetNodeView() {
	var getParentNodeView; //= MakeGetNodeView();
	return createSelector(
		(_, {firebase}: {firebase: FirebaseDatabase})=>firebase,
		(_, {map}: {map: Map})=>map._key.KeyToInt,
		(state: RootState, {map})=>state.main.mapViews[map._key.KeyToInt] && state.main.mapViews[map._key.KeyToInt].rootNodeView,
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

export type RatingsRoot = {[key: string]: RatingsSet};
export type RatingsSet = {[key: string]: Rating};
export type Rating = {updated: number, value: number};

export function GetPaths_NodeRatingsRoot({node}: {node: MapNode}) {
	return [DBPath(`nodeRatings/${node._key}`)];
}
export const GetNodeRatingsRoot = ({firebase}: RootState, {node}: {node: MapNode})=>GetData(firebase, GetPaths_NodeRatingsRoot({node})[0]);

/*export function GetPaths_NodeRatings({node, ratingType}: {node: MapNode, ratingType: RatingType}) {
	return [DBPath(`nodeRatings/${node._key}/${ratingType}`)];
}
export const MakeGetNodeRatings = ()=>createSelector(
	()=>({firebase}: RootState, {node, ratingType}: {node: MapNode, ratingType: RatingType})=>GetData(firebase, GetPaths_NodeRatings({node, ratingType})[0]),
	ratingRoot=> {
		return ratingRoot ? ratingRoot.Props.Where(a=>a.name != "_key").Select(a=>a.value) : [];
	}
);*/

export var MakeGetNodeChildIDs = ()=>createSelector(
	(_, {node}: {node: MapNode})=>node.children,
	nodeChildren=> {
		return (nodeChildren || {}).VKeys().Select(a=>a.KeyToInt);
	}
);
/*export function GetNodes(state: RootState, {nodeIDs}: {nodeIDs: number[]}) {
	return ;
}*/

export function MakeGetNodeChildren() {
	var getNodeChildIDs = MakeGetNodeChildIDs();
	return createSelector(
		({firebase})=>firebase,
		getNodeChildIDs,
		(firebase, childIDs)=> {
			if (firebase == null) debugger;
			return childIDs.Select(a=>GetData(firebase, `nodes/e${a}`)).Where(a=>a);
		}
	);
}