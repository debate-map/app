import {combineReducers} from "redux";
import {firebaseStateReducer as firebase} from "react-redux-firebase";
import locationReducer from "./location";
import {reducer as form} from "redux-form";
import {LOCATION_CHANGE} from "./location";
//import {TOGGLE_USER_PANEL_OPEN} from "../containers/Navbar";
var {SET_USER_PANEL_OPEN} = require("../containers/Navbar");

export function makeRootReducer(asyncReducers?) {
	return combineReducers({
		main: mainReducer,
		// Add sync reducers here
		firebase,
		form,
		location: locationReducer,
		...asyncReducers
	});
}
export default makeRootReducer;

export function injectReducer(store, {key, reducer}) {
	store.asyncReducers[key] = reducer;
	store.replaceReducer(makeRootReducer(store.asyncReducers));
}

function mainReducer(state = {}, action) {
	switch (action.type) {
		case SET_USER_PANEL_OPEN: return {...state, userPanelOpen: action.payload};
		default: return state;
	}
}