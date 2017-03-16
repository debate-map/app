import {Map} from "../routes/@Shared/Maps/Map";
import {combineReducers} from "redux";
import {firebaseStateReducer, helpers} from "react-redux-firebase";
import {reducer as formReducer} from "redux-form";
import {ACTShowMessageBox, MessageBoxOptions} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {ACTSetUserPanelOpen} from "../containers/Navbar";
import {routerReducer} from "react-router-redux";
import {ACTSelectMapNode} from "../routes/@Shared/Maps/MapNodeUI";
import {ToJSON, FromJSON} from "../Frame/General/Globals";
import V from "../Frame/V/V";
import {MainState, MainReducer} from "./Store/Main";
import {createSelector} from "reselect";
import {MapNodePath} from "./Store/Main/MapViews";
import {DBPath} from "../Frame/Database/DatabaseHelpers";

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
}
export function MakeRootReducer(asyncReducers?) {
	return combineReducers({
		main: MainReducer,
		firebase: firebaseStateReducer,
		form: formReducer,
		router: routerReducer,
		...asyncReducers
	});
}

export function GetSelectedNodeID(state: RootState, {map}: {map: Map}) { 
	let mapView = state.main.mapViews[map._key.KeyToInt];
	let selectedNodeView = V.GetKeyValuePairsInObjTree(mapView).FirstOrX(a=>a.prop == "selected" && a.value);
	if (selectedNodeView && selectedNodeView.ancestorPairs.Last().prop == "rootNodeView")
		return map.rootNode.KeyToInt;
	return selectedNodeView ? selectedNodeView.ancestorPairs.Last().prop as number : null;
}
export function GetNodes_FBPaths({nodeIDs}: {nodeIDs: number[]}) {
	return nodeIDs.Select(a=>DBPath(`nodes/${a}`));
}
export function GetNodes(state: RootState, {nodeIDs}: {nodeIDs: number[]}) {
	return nodeIDs.Select(a=>helpers.dataToJS(state.firebase, DBPath(`nodes/${a}`))).Where(a=>a);
}
export function GetNodeView(state: RootState, {map, path}: {map: Map, path: MapNodePath}) {
	if (map == null || path == null) return null;

	var mapView = state.main.mapViews[map._key.KeyToInt];
	if (mapView == null) return;
	var currentNodeView = mapView.rootNodeView || {children: {}};
	for (let [index, nodeID] of path.nodeIDs.Skip(1).entries()) {
		currentNodeView = currentNodeView.children[nodeID];
		if (currentNodeView == null)
			return null;
	}
	return currentNodeView;
}