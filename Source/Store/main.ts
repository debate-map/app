import {MapViews, MapNodeView, MapView} from "./main/mapViews/@MapViews";
import {combineReducers} from "redux";
import Action from "../Frame/General/Action";
import {MapViewsReducer} from "./main/mapViews";
import {RatingUIReducer, RatingUIState} from "./main/ratingUI";
import {NotificationMessage} from "./main/@NotificationMessage";
import {rootPageDefaultChilds} from "../Frame/General/URLs";
import {VURL} from "js-vextensions";
import {Global} from "../Frame/General/Others";
import {CombineReducers} from "../Frame/Store/ReducerUtils";
import {DebatesReducer, Debates, ACTDebateMapSelect} from "./main/debates";
import SubpageReducer from "./main/@Shared/$subpage";
import { LOCATION_CHANGED } from "redux-little-router";
import { MapInfo } from "Store/main/maps/@MapInfo";
import {globalMapID} from "./firebase/nodes/@MapNode";
import { ShallowChanged } from "react-vextensions";
import { MapInfoReducer } from "Store/main/maps/$map";
import {demoMap, demoRootNodeID} from "../UI/Home/DemoMap";
import { Personal } from "Store/main/personal";
import {PersonalReducer, ACTPersonalMapSelect} from "./main/personal";
import {Database, DatabaseReducer} from "./main/database";
import {GetNodeL3} from "./firebase/nodes/$node";
import {SimpleReducer} from "./index";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export enum WeightingType {
	Votes = 10,
	ReasonScore = 20,
}

// class is used only for initialization
export class MainState {
	page: string;
	urlExtraStr: string;
	envOverride: string;
	dbVersionOverride: string;
	analyticsEnabled: boolean;
	topLeftOpenPanel: string;
	topRightOpenPanel: string;
	ratingUI: RatingUIState;
	notificationMessages: NotificationMessage[];

	// pages (and nav-bar panels)
	// ==========

	stream: {subpage: string};
	chat: {subpage: string};
	reputation: {subpage: string};

	database: Database;
	feedback: {subpage: string};
	//forum: Forum;
	more: {subpage: string};
	home: {subpage: string};
	social: {subpage: string};
	personal: Personal;
	debates: Debates;
	global: {subpage: string};

	search: {subpage: string};
	guide: {subpage: string};
	profile: {subpage: string};

	// maps
	// ==========

	maps: {[key: number]: MapInfo};

	nodeLastAcknowledgementTimes: {[key: number]: number};
	currentNodeBeingAdded_path: string;

	//openMap: number;
	mapViews: MapViews;
	copiedNodePath: string;
	copiedNodePath_asCut: boolean;

	initialChildLimit: number;
	showReasonScoreValues: boolean;
	weighting: WeightingType;
}
export class ACTSetPage extends Action<string> {}
export class ACTSetSubpage extends Action<{page: string, subpage: string}> {}
export class ACTTopLeftOpenPanelSet extends Action<string> {}
export class ACTTopRightOpenPanelSet extends Action<string> {}
@Global
export class ACTNotificationMessageAdd extends Action<NotificationMessage> {}
export class ACTNotificationMessageRemove extends Action<number> {}
//export class ACTOpenMapSet extends Action<number> {}
export class ACTNodeCopy extends Action<{path: string, asCut: boolean}> {}
export class ACTSetInitialChildLimit extends Action<{value: number}> {}
export class ACTSetLastAcknowledgementTime extends Action<{nodeID: number, time: number}> {}
//export class ACTSetCurrentNodeBeingAdded extends Action<{path: string}> {}

let MainReducer_Real;
export function MainReducer(state, action) {
	MainReducer_Real = MainReducer_Real || persistReducer({key: "main_key", storage, blacklist: ["notificationMessages"]}, CombineReducers({
		page: (state = null, action)=> {
			if (action.Is(ACTSetPage)) return action.payload;
			return state;
		},

		/*_: (state = null, action)=> {
			PreDispatchAction(action);
			return null;
		},*/
		// use this for eg. conditional debug displaying on live site
		urlExtraStr: (state = null, action)=> {
			//if ((action.type == "@@INIT" || action.type == "persist/REHYDRATE") && startURL.GetQueryVar("env"))
			//if ((action.type == "PostRehydrate") && startURL.GetQueryVar("env"))
			if (action.type == LOCATION_CHANGED && VURL.FromState(action.payload).GetQueryVar("extra")) {
				let newVal = VURL.FromState(action.payload).GetQueryVar("extra");
				if (newVal == "null") newVal = null;
				return newVal;
			}
			return state;
		},
		envOverride: (state = null, action)=> {
			if (action.type == LOCATION_CHANGED && VURL.FromState(action.payload).GetQueryVar("env")) {
				let newVal = VURL.FromState(action.payload).GetQueryVar("env");
				if (newVal == "null") newVal = null;
				return newVal;
			}
			return state;
		},
		dbVersionOverride: (state = null, action)=> {
			if (action.type == LOCATION_CHANGED && VURL.FromState(action.payload).GetQueryVar("dbVersion")) {
				let str = VURL.FromState(action.payload).GetQueryVar("dbVersion");
				return str == "null" ? null : parseInt(str);
			}
			return state;
		},
		analyticsEnabled: (state = true, action)=> {
			if (action.type == LOCATION_CHANGED && VURL.FromState(action.payload).GetQueryVar("analytics") == "false")
				return false;
			if (action.type == LOCATION_CHANGED && VURL.FromState(action.payload).GetQueryVar("analytics") == "true")
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
		notificationMessages: (state: NotificationMessage[] = [], action)=> {
			if (action.Is(ACTNotificationMessageAdd))
				return [...state, action.payload];
			if (action.Is(ACTNotificationMessageRemove))
				return state.filter(a=>a.id != action.payload);
			NotificationMessage.lastID = Math.max(NotificationMessage.lastID, state.length ? state.map(a=>a.id).Max(null, true) : -1);
			return state;
		},

		// pages (and nav-bar panels)
		// ==========

		stream: CombineReducers({subpage: SubpageReducer("stream")}),
		chat: CombineReducers({subpage: SubpageReducer("chat")}),
		reputation: CombineReducers({subpage: SubpageReducer("reputation")}),

		database: DatabaseReducer,
		feedback: CombineReducers({subpage: SubpageReducer("feedback")}),
		//forum: ForumReducer,
		more: CombineReducers({subpage: SubpageReducer("more")}),
		home: CombineReducers({subpage: SubpageReducer("home")}),
		social: CombineReducers({subpage: SubpageReducer("social")}),
		personal: PersonalReducer,
		debates: DebatesReducer,
		global: CombineReducers({subpage: SubpageReducer("global")}),

		search: CombineReducers({subpage: SubpageReducer("search")}),
		guide: CombineReducers({subpage: SubpageReducer("guide")}),
		profile: CombineReducers({subpage: SubpageReducer("profile")}),
		
		// maps
		// ==========

		maps: (state = {}, action)=> {
			let newState = {...state};
			/*if (action.Is(ACTSetPage) && action.payload == "global" && state[globalMapID] == null) {
				state = {...state, [globalMapID]: new MapInfo()};
			}*/
			if (state[demoMap._id] == null) newState[demoMap._id] = new MapInfo().Strip();
			if (state[globalMapID] == null) newState[globalMapID] = new MapInfo().Strip();
			if ((action.Is(ACTPersonalMapSelect) || action.Is(ACTDebateMapSelect)) && newState[action.payload.id] == null) {
				newState[action.payload.id] = new MapInfo().Strip();
			}

			for (let key in newState) {
				//action.VSet("parentKey", parseInt(key), {prop: {}});
				if (action.payload && action.payload.mapID && key != action.payload.mapID) continue;
				newState[key] = MapInfoReducer(key)(newState[key], action); //, parseInt(key));
			}
			return ShallowChanged(newState, state) ? newState : state;
		},

		nodeLastAcknowledgementTimes: (state = {}, action)=> {
			if (action.Is(ACTSetLastAcknowledgementTime)) {
				state = {...state, [action.payload.nodeID]: action.payload.time};
			}
			return state;
		},
		currentNodeBeingAdded_path: SimpleReducer(a=>a.main.currentNodeBeingAdded_path),

		/*openMap: (state = null, action)=> {
			if (action.Is(ACTSetPage) && action.payload == "global") return globalMapID;
			//if (action.Is(ACTOpenMapSet)) return action.payload;
			return state;
		},*/
		mapViews: MapViewsReducer,
		copiedNodePath: (state = null as string, action)=> {
			if (action.Is(ACTNodeCopy)) return action.payload.path;
			return state;
		},
		copiedNodePath_asCut: (state = null as string, action)=> {
			if (action.Is(ACTNodeCopy)) return action.payload.asCut;
			return state;
		},
		initialChildLimit: SimpleReducer(a=>a.main.initialChildLimit, 5),
		showReasonScoreValues: SimpleReducer(a=>a.main.showReasonScoreValues, false),
		weighting: SimpleReducer(a=>a.main.weighting, WeightingType.Votes),
	}));
	return MainReducer_Real(state, action);
}

// selectors
// ==========

export function GetOpenMapID() {
	//return State(a=>a.main.openMap);
	let page = State(a=>a.main.page);
	if (page == "home") return demoMap._id;
	if (page == "personal") return State(a=>a.main.personal.selectedMapID);
	if (page == "debates") return State(a=>a.main.debates.selectedMapID);
	if (page == "global") return globalMapID;
	return null;
}

export function GetPage() {
	return State(a=>a.main.page) || "home";
}
export function GetSubpage() {
	let page = GetPage();
	return (State("main", page, "subpage") as string) || rootPageDefaultChilds[page];
}

export function GetLastAcknowledgementTime(nodeID: number) {
	return State("main", "nodeLastAcknowledgementTimes", nodeID) as number || 0;
}

export function GetCopiedNodePath() {
	return State(a=>a.main.copiedNodePath);
}
export function GetCopiedNode() {
	let path = GetCopiedNodePath();
	if (!path) return null;
	return GetNodeL3(path);
}