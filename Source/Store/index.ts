import {Assert} from "../Frame/General/Assert";
import {VMenuReducer, VMenuState} from "react-vmenu";
import {combineReducers} from "redux";
import {firebaseStateReducer, helpers} from "react-redux-firebase";
//import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions, MessageBoxReducer, MessageBoxState} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {ToJSON, FromJSON} from "../Frame/General/Globals";
import V from "../Frame/V/V";
import {createSelector} from "reselect";
import {DBPath, GetData} from "../Frame/Database/DatabaseHelpers";
import {QuickIncrement, Debugger} from "../Frame/General/Globals_Free";
import {GetTreeNodesInObjTree, DeepGet} from "../Frame/V/V";
import {Set} from "immutable";
import {MainState, MainReducer} from "./main";
import {LocationDescriptorObject} from "history";
import Immutable from "immutable";
import {ACTDebateMapSelect} from "./main/debates";
import u from "updeep";
import {URL} from "../Frame/General/URLs";

export function InjectReducer(store, {key, reducer}) {
	store.asyncReducers[key] = reducer;
	store.replaceReducer(MakeRootReducer(store.asyncReducers));
}

export class ACTSet extends Action<{path: string, value}> {
	constructor(payload) {
		super(payload);
		this.type = "ACTSet_" + payload.path; // add path to action-type, for easier debugging in dev-tools
	}
}

// class is used only for initialization
export class RootState {
	main: MainState;
	//firebase: FirebaseDatabase;
	//firebase: Immutable.Map<any, any>;
	firebase: any;
	//form: any;
	router: RouterState;
	messageBox: MessageBoxState;
	vMenu: VMenuState;
}
export function MakeRootReducer(extraReducers?) {
	const innerReducer = combineReducers({
		main: MainReducer,
		firebase: firebaseStateReducer,
		//form: formReducer,
		//router: routerReducer,
		//router: RouterReducer,
		messageBox: MessageBoxReducer,
		vMenu: VMenuReducer,
		...extraReducers
	});

	return (state: RootState, action)=> {
		let result = innerReducer(state, action) as RootState;
		//if (action.Is(ACTSet)) {
		if (action.type.startsWith("ACTSet_")) {
			result = u.updateIn(action.payload.path.replace(/\//g, "."), u.constant(action.payload.value), result);
		}
		return result;
	};
}

/*function RouterReducer(state = {location: null}, action) {
	let oldURL = URL.FromState(state.location);
	let newURL = oldURL.Clone();
	if (action.Is(ACTDebateMapSelect) && action.payload.id == null) {
		newURL.pathNodes.length = 1;
	}
	if (oldURL.toString() != newURL.toString()) {
		browserHistory.push(newURL.toString({domain: false}));
		return {...state, location: newURL.ToState()};
	}

	return routerReducer(state, action);
}*/

interface RouterState {
	location: LocationDescriptorObject & {hash: string}; // typing must be outdated, as lacks hash prop
	history: any;
}