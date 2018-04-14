import {Assert, DeepGet, DeepSet} from "js-vextensions";
import {VMenuReducer, VMenuState} from "react-vmenu";
import {combineReducers} from "redux";
import {firebaseStateReducer, helpers} from "react-redux-firebase";
//import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions, MessageBoxReducer, MessageBoxState} from "react-vmessagebox";
import Action, { IsACTSetFor } from "../Frame/General/Action";
import {createSelector} from "reselect";
import {DBPath, GetData} from "../Frame/Database/DatabaseHelpers";
import {Debugger} from "../Frame/General/Others";
import {E} from "js-vextensions";
import {MainState, MainReducer} from "./main";
import {LocationDescriptorObject} from "history";
import {ACTDebateMapSelect} from "./main/debates";
import u from "updeep";
import {VURL} from "js-vextensions";
import {HandleError} from "../Frame/General/Errors";
import {ForumData, ForumReducer} from "firebase-forum";
import {FeedbackData, FeedbackReducer} from "firebase-feedback";
import {OnAccessPath} from "../Frame/Database/FirebaseConnect";
import { State_Options } from "UI/@Shared/StateOverrides";
import {State_overrides} from "../UI/@Shared/StateOverrides";
import {persistStore, persistReducer} from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web and AsyncStorage for react-native

// State() actually also returns the root-state (if no data-getter is supplied), but we don't reveal that in type-info (as its only to be used in console)
G({State});
/*declare global {
	function State<T>(pathSegment: ((state: RootState)=>T) | string | number, state?: RootState, countAsAccess?: boolean): T;
	function State<T>(pathSegments: (((state: RootState)=>T) | string | number)[], state?: RootState, countAsAccess?: boolean): any;
}
//function State<T>(pathSegmentOrSegments, state = State_extras.overrideState || store.getState(), countAsAccess = true) {
function State<T>(pathOrPathSegments, state?: RootState, countAsAccess?: boolean) {
	state = state || State_overrides.state || store.getState();
	countAsAccess = countAsAccess != null ? countAsAccess : (State_overrides.countAsAccess != null ? State_overrides.countAsAccess : true);
	if (pathOrPathSegments == null) return state;

	let propChain: string[];
	if (typeof pathOrPathSegments == "string") {
		propChain = pathOrPathSegments.split("/");
	} else if (typeof pathOrPathSegments == "function") {
		propChain = ConvertPathGetterFuncToPropChain(pathOrPathSegments);
	} else {
		if (pathOrPathSegments.length == 0) return state;

		propChain = pathOrPathSegments.SelectMany(segment=> {
			if (segment instanceof Function) {
				return ConvertPathGetterFuncToPropChain(segment);
			}
			Assert(typeof segment == "number" || !segment.Contains("/"),
				`Each string path-segment must be a plain prop-name. (ie. contain no "/" separators) @segment(${segment})`);
			return [segment];
		});
	}

	let selectedData = DeepGet(state, propChain);
	if (countAsAccess) {
		let path = propChain.join("/");
		//Assert(g.inConnectFunc, "State(), with countAsAccess:true, must be called from within a Connect() func.");
		OnAccessPath(path);
	}
	return selectedData;
}*/

// for substantially better perf, we now only accept string-or-number arrays
declare global {
	function State<T>(): RootState;
	function State<T>(pathGetterFunc: (state: RootState)=>T): T;
	function State<T>(...pathSegments: (string | number)[]);
	function State<T>(options: State_Options, ...pathSegments: (string | number)[]);
}
function State<T>(...args) {
	let pathSegments: (string | number)[], options = new State_Options();
	if (args.length == 0) return State_overrides.state || store.getState();
	else if (typeof args[0] == "function") pathSegments = ConvertPathGetterFuncToPropChain(args[0]);
	else if (typeof args[0] == "string") pathSegments = args.length == 1 ? args[0].split("/") : args; // if only one string provided, assume it's the full path
	else [options, ...pathSegments] = args;

	if (__DEV__) {
		Assert(pathSegments.All(segment=>segment != null), `Path-segment cannot be null. @segments(${pathSegments})`);
		Assert(pathSegments.All(segment=>typeof segment == "number" || !segment.Contains("/")),
			`Each string path-segment must be a plain prop-name. (ie. contain no "/" separators) @segments(${pathSegments})`);
	}

	options.state = options.state || State_overrides.state || store.getState();
	options.countAsAccess = options.countAsAccess != null ? options.countAsAccess : (State_overrides.countAsAccess != null ? State_overrides.countAsAccess : true);

	let selectedData = DeepGet(options.state, pathSegments);
	//if (options.countAsAccess && pathSegments.length) {
	if (options.countAsAccess) {
		let path = pathSegments.join("/");
		//Assert(g.inConnectFunc, "State(), with countAsAccess:true, must be called from within a Connect() func.");
		OnAccessPath(path);
	}
	return selectedData;
}
function ConvertPathGetterFuncToPropChain(pathGetterFunc: Function) {
	let pathStr = pathGetterFunc.toString().match(/return a\.(.+?);/)[1] as string;
	Assert(!pathStr.includes("["), `State-getter-func cannot contain bracket-based property-access.\n${nl
		}For variable inclusion, use multiple segments as in "State("main", "mapViews", mapID)".`);
	//let result = pathStr.replace(/\./g, "/");
	let result = pathStr.split(".");
	return result;
}
export function StorePath(pathGetterFunc: (state: RootState)=>any) {
	return ConvertPathGetterFuncToPropChain(pathGetterFunc).join("/");
}

export function InjectReducer(store, {key, reducer}) {
	store.asyncReducers[key] = reducer;
	store.replaceReducer(MakeRootReducer(store.asyncReducers));
}

type ACTSet_Payload = {path: string | ((state: RootState)=>any), value};
export class ACTSet extends Action<ACTSet_Payload> {
	constructor(path: string | ((state: RootState)=>any), value) {
		if (typeof path == "function") path = StorePath(path);
		super({path, value});
		this.type = "ACTSet_" + path; //.replace(/[^a-zA-Z0-9]/g, "_"); // add path to action-type, for easier debugging in dev-tools
	}
}
export function SimpleReducer(path: string | ((store: RootState)=>any), defaultValue = null) {
	if (IsFunction(path)) path = StorePath(path);
	return (state = defaultValue, action: Action<any>)=> {
		if (IsACTSetFor(action, path as string)) return action.payload.value;
		return state;
	};
}

// class is used only for initialization
export class RootState {
	main: MainState;
	//firebase: FirebaseDatabase;
	firebase: any;
	//form: any;
	router: RouterState;
	messageBox: MessageBoxState;
	vMenu: VMenuState;
	forum: ForumData;
	feedback: FeedbackData;
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
		feedback: FeedbackReducer,
		...extraReducers
	});

	let rootReducer = (state: RootState, rootAction)=> {
		let actions = rootAction.type == "ApplyActionSet" ? rootAction.actions : [rootAction];

		let result = state;
		for (let action of actions) {
			try {
				let oldResult = result;
				result = innerReducer(result, action) as RootState;
				//if (action.Is(ACTSet)) {
				/*if (action.type.startsWith("ACTSet_")) {
					result = u.updateIn(action.payload.path.replace(/\//g, "."), u.constant(action.payload.value), result);
				}*/

				if (action.type.startsWith("ACTSet_") && result == oldResult) {
					LogWarning(`An ${action.type} action was dispatched, but did not cause any change to the store contents! Did you forget to add a reducer entry?`);
				}
			} catch (ex) {
				HandleError(ex, true, {action});
			}
		}

		// make-so certain paths are ignored in redux-devtools-extension's Chart panel
		// temp removed; caused issues with new redux-persist
		/*let ignorePaths = [
			`firebase/data/${DBPath("nodes")}`,
			`firebase/data/${DBPath("nodeRevisions")}`,
		];
		for (let path of ignorePaths) {
			if (DeepGet(result, path) != null && DeepGet(state, path) == null) {
				DeepSet(result, path + "/toJSON", ()=>"[IGNORED]");
			}
		}*/

		return result;
	};

	// removed for now, since we only want "main" -- and we're already persisting "main" with its own persistReducer call (since it needs local persist customization)
	//rootReducer = persistReducer({storage, key: "root_key", whitelist: ["main"], debug: true}, rootReducer);

	return rootReducer;
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