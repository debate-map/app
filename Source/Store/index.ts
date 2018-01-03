import {Assert} from "js-vextensions";
import {VMenuReducer, VMenuState} from "react-vmenu";
import {combineReducers} from "redux";
import {firebaseStateReducer, helpers} from "react-redux-firebase";
//import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions, MessageBoxReducer, MessageBoxState} from "react-vmessagebox";
import Action from "../Frame/General/Action";
import {createSelector} from "reselect";
import {DBPath, GetData} from "../Frame/Database/DatabaseHelpers";
import {QuickIncrement, Debugger} from "../Frame/General/Globals_Free";
import {Set} from "immutable";
import {MainState, MainReducer} from "./main";
import {LocationDescriptorObject} from "history";
import Immutable from "immutable";
import {ACTDebateMapSelect} from "./main/debates";
import u from "updeep";
import {VURL} from "js-vextensions";
import {HandleError} from "../Frame/General/Errors";
import {ForumData, ForumReducer} from "firebase-forum";

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
	forum: ForumData;
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
		forum: ForumReducer,
		...extraReducers
	});

	return (state: RootState, rootAction)=> {
		let actions = rootAction.type == "ApplyActionSet" ? rootAction.actions : [rootAction];

		let result = state;
		for (let action of actions) {
			try {
				result = innerReducer(result, action) as RootState;
				//if (action.Is(ACTSet)) {
				if (action.type.startsWith("ACTSet_")) {
					result = u.updateIn(action.payload.path.replace(/\//g, "."), u.constant(action.payload.value), result);
				}
			} catch (ex) {
				HandleError(ex, true, {action});
			}
		}
		return result;
	};
}

/*function RouterReducer(state = {location: null}, action) {
	let oldURL = VURL.FromState(state.location);
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