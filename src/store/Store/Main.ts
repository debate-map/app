import {CombineReducers} from "../reducers";
import {MapViews, MapViewsReducer} from "./Main/MapViews";
import {combineReducers} from "redux";
import {firebaseStateReducer} from "react-redux-firebase";
import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions} from "../../Frame/UI/VMessageBox";
import Action from "../../Frame/General/Action";
import {ACTSetUserPanelOpen} from "../../containers/Navbar";
import {routerReducer} from "react-router-redux";
import {ToJSON, FromJSON} from "../../Frame/General/Globals";
import V from "../../Frame/V/V";

// class is used only for initialization
export class MainState {
	userPanelOpen = false;

	openMap: number;
	mapViews = {} as MapViews;
}

export const MainReducer = CombineReducers({
	userPanelOpen: (state = false, action)=> {
		// cheats
		if (action.type == "@@reactReduxFirebase/SET" && (action as any).data)
			(action as any).data._key = ((action as any).path as string).split("/").Last();

		//case SET_USER_PANEL_OPEN: return {...state, userPanelOpen: action.payload};
		if (action.Is(ACTSetUserPanelOpen))
			return action.payload;
		return state;
	},
	openMap: (state = null, action)=> {
		if (action.type == "@@router/LOCATION_CHANGE" && action.payload.pathname == "/global")
			return 1;
		return state;
	},
	mapViews: MapViewsReducer
});