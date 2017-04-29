import {Assert} from "../Frame/General/Assert";
import {VMenuReducer, VMenuState} from "react-vmenu";
import {combineReducers} from "redux";
import {firebaseStateReducer, helpers} from "react-redux-firebase";
//import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions, MessageBoxReducer, MessageBoxState} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {routerReducer} from "react-router-redux";
import {ToJSON, FromJSON} from "../Frame/General/Globals";
import V from "../Frame/V/V";
import {createSelector} from "reselect";
import {DBPath, GetData} from "../Frame/Database/DatabaseHelpers";
import {QuickIncrement, Debugger} from "../Frame/General/Globals_Free";
import {GetTreeNodesInObjTree} from "../Frame/V/V";
import {Set} from "immutable";
import {MainState, MainReducer} from "./main";
import {LocationDescriptorObject} from "history";
import * as Immutable from "immutable";

export function InjectReducer(store, {key, reducer}) {
	store.asyncReducers[key] = reducer;
	store.replaceReducer(MakeRootReducer(store.asyncReducers));
}

export function CombineReducers(reducerMap: {[key: string]: (state, action: Action<any>)=>any});
export function CombineReducers(getInitialState: ()=>any, reducerMap: {[key: string]: (state, action: Action<any>)=>any});
export function CombineReducers(...args) {
	let getInitialState, reducerMap;
	if (args.length == 1) [reducerMap] = args;
	else [getInitialState, reducerMap] = args;

	if (getInitialState) {
		let reducer = combineReducers(reducerMap);
		return (state = getInitialState(), action)=> {
		//return (state = getInitialState().VAct(a=>Object.setPrototypeOf(a, Object.getPrototypeOf({}))), action)=> {
		//return (state, action)=> {
			/*state = state || getInitialState().VAct(a=>Object.setPrototypeOf(a, Object.getPrototypeOf({})));
			Assert(Object.getPrototypeOf(state) == Object.getPrototypeOf({}));*/
			// combineReducers is picky; it requires it be passed a plain object; thus, we oblige ;-(
			Object.setPrototypeOf(state, Object.getPrototypeOf({}));
			return reducer(state, action);
		};
	}
	return combineReducers(reducerMap);
}

// class is used only for initialization
export class RootState {
	main: MainState;
	//firebase: FirebaseDatabase;
	firebase: Immutable.Map<any, any>;
	//form: any;
	router: RouterState;
	messageBox: MessageBoxState;
	vMenu: VMenuState;
}
export function MakeRootReducer(asyncReducers?) {
	return combineReducers({
		main: MainReducer,
		firebase: firebaseStateReducer,
		//form: formReducer,
		router: routerReducer,
		messageBox: MessageBoxReducer,
		vMenu: VMenuReducer,
		...asyncReducers
	});
}

interface RouterState {
	location: LocationDescriptorObject & {hash: string}; // typing must be outdated, as lacks hash prop
	history: any;
}