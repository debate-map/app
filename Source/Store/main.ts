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
import {GetTreeNodesInObjTree} from "../Frame/V/V";
import {PreDispatchAction} from "../Frame/Store/ActionProcessor";
import {CachedTransform} from "../Frame/V/VCache";
import {MapViewsReducer} from "./main/mapViews";
import {RatingUIReducer, RatingUIState} from "./main/ratingUI";
import NotificationMessage from "./main/@NotificationMessage";
import {URL} from "../Frame/General/URLs";
import {Global} from "../Frame/General/Globals_Free";
import {GetData} from "../Frame/Database/DatabaseHelpers";
import {GetTerms} from "./firebase/terms";

// class is used only for initialization
export class MainState {
	envOverride: string;
	analyticsEnabled: boolean;
	topLeftOpenPanel: string;
	topRightOpenPanel: string;
	ratingUI: RatingUIState;
	notificationMessages: NotificationMessage[];

	selectedTerm: number;

	openMap: number;
	mapViews: MapViews;
	copiedNodePath: string;
}
export class ACTTopLeftOpenPanelSet extends Action<string> {}
export class ACTTopRightOpenPanelSet extends Action<string> {}
@Global
export class ACTNotificationMessageAdd extends Action<NotificationMessage> {}
export class ACTNotificationMessageRemove extends Action<number> {}
export class ACTTermSelect extends Action<{id: number}> {}
//export class ACTOpenMapSet extends Action<number> {}
export class ACTNodeCopy extends Action<{path: string}> {}

let MainReducer_Real;
export function MainReducer(state, action) {
	MainReducer_Real = MainReducer_Real || CombineReducers({
		/*_: (state = null, action)=> {
			PreDispatchAction(action);
			return null;
		},*/
		envOverride: (state = null, action)=> {
			//if ((action.type == "@@INIT" || action.type == "persist/REHYDRATE") && startURL.GetQueryVar("env"))
			//if ((action.type == "PostRehydrate") && startURL.GetQueryVar("env"))
			if (action.type == "@@router/LOCATION_CHANGE" && URL.FromState(action.payload).GetQueryVar("env")) {
				let newVal = URL.FromState(action.payload).GetQueryVar("env");
				if (newVal == "null")
					newVal = null;
				return newVal;
			}
			return state;
		},
		analyticsEnabled: (state = true, action)=> {
			if (action.type == "@@router/LOCATION_CHANGE" && URL.FromState(action.payload).GetQueryVar("analytics") == "false")
				return false;
			if (action.type == "@@router/LOCATION_CHANGE" && URL.FromState(action.payload).GetQueryVar("analytics") == "true")
				return true;
			return state;
		},
		topLeftOpenPanel: (state = null, action)=> {
			if (action.Is(ACTTopLeftOpenPanelSet))
				return action.payload;
			return state;
		},
		topRightOpenPanel: (state = null, action)=> {
			if (action.Is(ACTTopRightOpenPanelSet))
				return action.payload;
			return state;
		},
		ratingUI: RatingUIReducer,
		notificationMessages: (state = [] as NotificationMessage[], action)=> {
			if (action.Is(ACTNotificationMessageAdd))
				return [...state, action.payload];
			if (action.Is(ACTNotificationMessageRemove))
				return state.filter(a=>a.id != action.payload);
			NotificationMessage.lastID = Math.max(NotificationMessage.lastID, state.length ? state.map(a=>a.id).Max() : -1);
			return state;
		},
		
		// terms
		selectedTerm: (state = null, action)=> {
			if (action.Is(ACTTermSelect))
				return action.payload.id;
			return state;
		},

		// maps
		openMap: (state = null, action)=> {
			if (action.type == "@@router/LOCATION_CHANGE" && URL.FromState(action.payload).pathNodes[0] == "global")
				return 1;
			/*if (action.Is(ACTOpenMapSet))
				return action.payload;*/
			return state;
		},
		mapViews: MapViewsReducer,
		copiedNodePath: (state = null as string, action)=> {
			if (action.Is(ACTNodeCopy))
				return action.payload.path;
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
export function GetSelectedTermID() {
	return State().main.selectedTerm;
}
export function GetSelectedTerm() {
	let selectedID = State().main.selectedTerm;
	//return GetData(`terms/${selectedID}`);
	return (GetTerms() || []).find(a=>a._id == selectedID);
}