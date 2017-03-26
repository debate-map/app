import {Map} from "../routes/@Shared/Maps/Map";
import {combineReducers} from "redux";
import {firebaseStateReducer, helpers} from "react-redux-firebase";
import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions, MessageBoxReducer, MessageBoxState} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {routerReducer} from "react-router-redux";
import {ToJSON, FromJSON} from "../Frame/General/Globals";
import V from "../Frame/V/V";
import {createSelector} from "reselect";
import {DBPath, GetData} from "../Frame/Database/DatabaseHelpers";
import {firebase} from "../config.js";
import {MapNode} from "../routes/@Shared/Maps/MapNode";
import {FirebaseDatabase} from "../Frame/UI/ReactGlobals";
import {QuickIncrement, Debugger} from "../Frame/General/Globals_Free";
import {GetTreeNodesInObjTree} from "../Frame/V/V";
import {Set} from "immutable";
import {MainState, MainReducer} from "./Root/Main";

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
	messageBox: MessageBoxState;
}
export function MakeRootReducer(asyncReducers?) {
	return combineReducers({
		main: MainReducer,
		firebase: firebaseStateReducer,
		form: formReducer,
		router: routerReducer,
		messageBox: MessageBoxReducer,
		...asyncReducers
	});
}