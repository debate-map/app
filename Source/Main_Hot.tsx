import {ParseModuleData, Require} from "webpack-runtime-require";
import {Store} from "redux";
import {RootState, MakeRootReducer} from "./Store/index";
import {FirebaseApp, DBPath, GetData} from "./Frame/Database/DatabaseHelpers";
import ReactDOM from "react-dom";
import StackTrace from "stacktrace-js";
import React from "react/lib/ReactWithAddons";
import {OnAccessPath, Connect} from "./Frame/Database/FirebaseConnect";

import "./Store/firebase/nodeRatings/@RatingsRoot";
import {State_overrides, State_Options} from "./UI/@Shared/StateOverrides";
import {JSVE, DeepGet} from "js-vextensions";
import "./Frame/General/Logging";
import {Manager as Manager_Forum} from "firebase-forum";
import {Manager as Manager_Feedback} from "firebase-feedback";
import Moment from "moment";
import {GetNewURL} from "./Frame/URL/URLManager";
import {replace, push} from "redux-little-router";
import {GetUserID, GetUser} from "Store/firebase/users";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {GetDataAsync, GetAsync} from "Frame/Database/DatabaseHelpers";
import {GetUserPermissionGroups} from "./Store/firebase/users";
import VReactMarkdown_Remarkable from "./Frame/ReactComponents/VReactMarkdown_Remarkable";

JSVE.logFunc = Log;

//g.FirebaseConnect = Connect;
let sharedData = {
	//store: null, // set below
	rootReducer: MakeRootReducer(),
	State_overrides,
	GetNewURL,
	FormatTime: (time: number, formatStr: string)=>Moment(time).format(formatStr),
	
	router_replace: replace,
	router_push: push,
	
	logTypes: g.logTypes,

	//FirebaseConnect: Connect, // must set "window.FirebaseConnect" manually
	State,
	GetData: (options, ...pathSegments)=>GetData(E(options, {inVersionRoot: false}), ...pathSegments),
	GetDataAsync: (options, ...pathSegments)=>GetDataAsync(E(options, {inVersionRoot: false}), ...pathSegments),
	GetAsync,
	ShowSignInPopup,
	GetUserID,
	GetUser,
	GetUserPermissionGroups,

	MarkdownRenderer: VReactMarkdown_Remarkable,
};

Manager_Forum.VSet(sharedData.Extended({
	storePath_mainData: "forum",
	storePath_dbData: DBPath("forum"),
}));
Manager_Feedback.VSet(sharedData.Extended({
	storePath_mainData: "feedback",
	storePath_dbData: DBPath("feedback"),
}));

// uncomment this if you want to load the source-maps and such ahead of time (making-so the first actual call can get it synchronously)
//StackTrace.get();

// temp
/*let oldReplace = require("redux-little-router").replace;
require("redux-little-router").replace = function() {
	Log("Test:" + arguments[0], true);
	return oldReplace.apply(this, arguments);
}
let oldPush = require("redux-little-router").push;
require("redux-little-router").push = function() {
	Log("Test2:" + arguments[0], true);
	return oldPush.apply(this, arguments);
}*/

let createStore = require("./Frame/Store/CreateStore").default;

declare global { var store: Store<RootState> & {firebase: FirebaseApp}; }
var store = createStore(g.__InitialState__, {}) as Store<RootState>;
G({store});

Manager_Forum.store = store;
Manager_Feedback.store = store;

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
	function State<T>(pathGetterFunc: (state: RootState)=>T);
	function State<T>(...pathSegments: (string | number)[]);
	function State<T>(options: State_Options, ...pathSegments: (string | number)[]);
}
function State<T>(...args) {
	let pathSegments: (string | number)[], options = new State_Options();
	if (args.length == 0) return State_overrides.state || store.getState();
	else if (typeof args[0] == "function") pathSegments = ConvertPathGetterFuncToPropChain(args[0]);
	else if (typeof args[0] == "string") pathSegments = args;
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

//setTimeout(()=> {
const mountNode = document.getElementById(`root`);
let {RootUIWrapper} = require(`./UI/Root`);
ReactDOM.render(<RootUIWrapper store={store}/>, mountNode);
//});

if (devEnv) {
	SetUpRR();
} else {
	G({RR: SetUpRR()})
}

function SetUpRR() {
	setTimeout(()=> {
		ParseModuleData();
		G({R: Require});
		let RR = {};
		for (let {name: moduleName, value: moduleExports} of (Require as any).Props()) {
			try {
				for (let key in moduleExports) {
					let finalKey = key;
					while (finalKey in RR) finalKey += `_`;
					RR[finalKey] = moduleExports[key];
				}
				if (moduleExports.default) {
					let finalKey = moduleName;
					while (finalKey in RR) finalKey += `_`;
					RR[finalKey] = moduleExports.default;
				}
			} catch (ex) {}
		}
		G({RR});
	});
}