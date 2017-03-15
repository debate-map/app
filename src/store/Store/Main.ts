import {MapView, MapNodeView} from "../../routes/@Shared/Maps/MapNode";
import {combineReducers} from "redux";
import {firebaseStateReducer} from "react-redux-firebase";
import {reducer as formReducer} from "redux-form";
import {ACTShowMessageBox, ACTShowConfirmationBox, MessageBoxOptions, ConfirmationBoxOptions} from "../../Frame/UI/VMessageBox";
import Action from "../../Frame/General/Action";
import {ACTSetUserPanelOpen} from "../../containers/Navbar";
import {routerReducer} from "react-router-redux";
import {ACTSelectMapNode} from "../../routes/@Shared/Maps/MapNodeUI";
import {ToJSON, FromJSON} from "../../Frame/General/Globals";
import V from "../../Frame/V/V";

// class is used only for initialization
export class MainState {
	userPanelOpen = false;
	openMessageBoxOptions: MessageBoxOptions;
	openConfirmationBoxOptions: ConfirmationBoxOptions;

	openMap: number;
	mapViews = {} as {[key: number]: MapView};
}
export function MainReducer(state = new MainState(), action: Action<any>) {
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
		return {...state, openMap: 1, mapViews: {...state.mapViews, 1: state.mapViews[1] || new MapView()}};
	if (action.Is(ACTSelectMapNode)) {
		let newRootNodeView = FromJSON(ToJSON(state.mapViews[action.payload.mapID].rootNodeView)) as MapNodeView;
		let newRootNodeView_currentNode;
		if (action.payload.path.nodeIDs.length) {
			newRootNodeView_currentNode = newRootNodeView;
			for (let nodeID of action.payload.path.nodeIDs.Skip(1)) {
				if (newRootNodeView_currentNode.children[nodeID] == null)
					newRootNodeView_currentNode.children[nodeID] = {children: {}};
				newRootNodeView_currentNode = newRootNodeView_currentNode.children[nodeID];
			}
			newRootNodeView_currentNode.selected = true;
		}

		let newState = {...state};
		newState.mapViews[action.payload.mapID].rootNodeID = action.payload.path.nodeIDs[0];
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