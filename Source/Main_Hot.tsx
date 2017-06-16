import {ParseModuleData, Require} from "webpack-runtime-require";
import {Store} from "redux";
import {RootState} from "./Store/index";
import {FirebaseApp} from "./Frame/Database/DatabaseHelpers";
import * as ReactDOM from "react-dom";
import * as StackTrace from "stacktrace-js";
import * as React from "react/lib/ReactWithAddons";
import {DeepGet} from "./Frame/V/V";
import {OnAccessPath} from "./Frame/Database/FirebaseConnect";

import "./Store/firebase/nodeRatings/@RatingsRoot";

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
g.Extend({store});

export var State_overrides = {
	state: null as RootState,
	countAsAccess: null,
};

// State() actually also returns the root-state (if no data-getter is supplied), but we don't reveal that in type-info (as its only to be used in console)
g.Extend({State});
declare global {
	function State<T>(pathSegment: ((state: RootState)=>T) | string | number, state?: RootState, countAsAccess?: boolean): T;
	function State<T>(pathSegments: (((state: RootState)=>T) | string | number)[], state?: RootState, countAsAccess?: boolean): any;
}
//function State<T>(pathSegmentOrSegments, state = State_extras.overrideState || store.getState(), countAsAccess = true) {
function State<T>(pathSegmentOrSegments, state?: RootState, countAsAccess?: boolean) {
	state = state || State_overrides.state || store.getState();
	countAsAccess = countAsAccess != null ? countAsAccess : (State_overrides.countAsAccess != null ? State_overrides.countAsAccess : true);

	if (pathSegmentOrSegments == null) return state;
	let pathSegments = pathSegmentOrSegments instanceof Array ? pathSegmentOrSegments : [pathSegmentOrSegments];
	if (pathSegments.length == 0) return state;

	let path = pathSegments.map(segment=> {
		if (segment instanceof Function) {
			let pathStr = (segment as any).toString().match(/return a\.(.+?);/)[1];
			Assert(!pathStr.includes("["), `State-getter-func can only contain plain paths. (eg: "state.main.mapViews")\n${nl
				}For variable inclusion, use strings as in "State(\`main.mapViews.\${mapID}\`)", or use multiple segments as in "State([a=>a.main.mapViews, mapID])".`)
			let result = pathStr.replace(/\./g, "/");
			return result;
		}
		return segment;
	}).join("/");

	let selectedData = DeepGet(state, path);
	if (countAsAccess) {
		//Assert(g.inConnectFunc, "State(), with countAsAccess:true, must be called from within a Connect() func.");
		OnAccessPath(path);
	}
	return selectedData;
}

//setTimeout(()=> {
const mountNode = document.getElementById(`root`);
let RootUIWrapper = require(`./UI/Root`).default;
ReactDOM.render(<RootUIWrapper store={store}/>, mountNode);
//});

if (devEnv) {
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