import {combineReducers} from "redux";
import {firebaseStateReducer} from "react-redux-firebase";
import locationReducer from "./location";
import {reducer as formReducer} from "redux-form";
import {LOCATION_CHANGE} from "./location";
import {ACTShowMessageBox, ACTShowConfirmationBox, MessageBoxOptions, ConfirmationBoxOptions} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {ACTSetUserPanelOpen} from "../containers/Navbar";

export function InjectReducer(store, {key, reducer}) {
	store.asyncReducers[key] = reducer;
	store.replaceReducer(MakeRootReducer(store.asyncReducers));
}

export class RootState {
	main: MainState;
}
export function MakeRootReducer(asyncReducers?) {
	return combineReducers({
		main: MainReducer,
		// Add sync reducers here
		firebase: firebaseStateReducer,
		form: formReducer,
		location: locationReducer,
		...asyncReducers
	});
}

export class MainState {
	userPanelOpen = false;
	openMessageBoxOptions: MessageBoxOptions;
	openConfirmationBoxOptions: ConfirmationBoxOptions;
}
function MainReducer(state = {}, action: Action<any>) {
	//case SET_USER_PANEL_OPEN: return {...state, userPanelOpen: action.payload};
	if (action.Is(ACTSetUserPanelOpen))
		return {...state, userPanelOpen: action.payload};
	if (action.Is(ACTShowMessageBox))
		return {...state, openMessageBoxOptions: action.payload};
	if (action.Is(ACTShowConfirmationBox))
		return {...state, openConfirmationBoxOptions: action.payload};
	return state;
}