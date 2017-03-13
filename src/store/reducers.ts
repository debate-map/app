import {MapView, MapNodeView} from "../routes/@Shared/Maps/MapNode";
import {combineReducers} from "redux";
import {firebaseStateReducer} from "react-redux-firebase";
import locationReducer from "./location";
import {reducer as formReducer} from "redux-form";
import {LOCATION_CHANGE} from "./location";
import {ACTShowMessageBox, ACTShowConfirmationBox, MessageBoxOptions, ConfirmationBoxOptions} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {ACTSetUserPanelOpen} from "../containers/Navbar";
import {routerReducer} from "react-router-redux";
import {ACTSelectMapNode} from "../routes/@Shared/Maps/MapNodeUI";
import {ToJSON, FromJSON} from "../Frame/General/Globals";
import V from "../Frame/V/V";

export function InjectReducer(store, {key, reducer}) {
	store.asyncReducers[key] = reducer;
	store.replaceReducer(MakeRootReducer(store.asyncReducers));
}

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
		//location: locationReducer,
		router: routerReducer,
		...asyncReducers
	});
}

export class MainState {
	userPanelOpen = false;
	openMessageBoxOptions: MessageBoxOptions;
	openConfirmationBoxOptions: ConfirmationBoxOptions;

	openMap: number;
	//selectedNode: number;
	mapViews: {[key: number]: MapView};
}
function MainReducer(state = {mapViews: {} as {[key: string]: MapView}}, action: Action<any>) {
	// cheats
	if (action.type == "@@reactReduxFirebase/SET")
		(action as any).data._key = ((action as any).path as string).split("/").Last();

	//case SET_USER_PANEL_OPEN: return {...state, userPanelOpen: action.payload};
	if (action.Is(ACTSetUserPanelOpen))
		return {...state, userPanelOpen: action.payload};
	if (action.Is(ACTShowMessageBox))
		return {...state, openMessageBoxOptions: action.payload};
	if (action.Is(ACTShowConfirmationBox))
		return {...state, openConfirmationBoxOptions: action.payload};

	if (action.type == "@@router/LOCATION_CHANGE" && action.payload.pathname == "/global")
		return {...state, openMap: 1, mapViews: {...state.mapViews, 1: state.mapViews[1] || {rootNodeView: {children: {}}}}};
	if (action.Is(ACTSelectMapNode)) {
		let newRootNodeView = FromJSON(ToJSON(state.mapViews[action.payload.mapID].rootNodeView)) as MapNodeView;
		let newRootNodeView_currentNode = newRootNodeView;
		for (let nodeID of action.payload.path.nodeIDs.Skip(1)) {
			if (newRootNodeView_currentNode.children[nodeID] == null)
				newRootNodeView_currentNode.children[nodeID] = {children: {}};
			newRootNodeView_currentNode = newRootNodeView_currentNode.children[nodeID];
		}
		newRootNodeView_currentNode.selected = true;

		let newState = {...state};
		newState.mapViews[action.payload.mapID].rootNodeView = newRootNodeView;
		let pairs = V.GetKeyValuePairsInObjTree(newState);
		for (let pair of pairs) {
			if (pair.prop == "selected" && pair.obj != newRootNodeView_currentNode)
				pair.obj.selected = false;
		}

		return newState;
	}

	return state;
}