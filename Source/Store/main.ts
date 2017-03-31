import {ToInt} from "../Frame/General/Types";
import {CombineReducers, RootState} from "./index";
import {MapViews, MapNodeView, MapView} from "./main/mapViews/@MapViews";
import {combineReducers} from "redux";
import {firebaseStateReducer} from "react-redux-firebase";
import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {routerReducer} from "react-router-redux";
import {ToJSON, FromJSON, Debugger} from "../Frame/General/Globals";
import V from "../Frame/V/V";
import {Map} from "../Store/firebase/maps/@Map";
import {createSelector} from "reselect";
import {FirebaseDatabase} from "../Frame/UI/ReactGlobals";
import {GetTreeNodesInObjTree} from "../Frame/V/V";
import {ProcessAction} from "../Frame/Store/ActionProcessor";
import {CachedTransform} from "../Frame/V/VCache";
import {MapViewsReducer} from "./main/mapViews";
import {RatingUIReducer, RatingUIState} from "./main/ratingUI";

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

let MainReducer_Real;
export function MainReducer(state, action) {
	MainReducer_Real = MainReducer_Real || CombineReducers({
		userPanelOpen: (state = false, action)=> {
			ProcessAction(action);

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

// selectors
// ==========

export function GetOpenMapID() {
	return State().main.openMap;
}