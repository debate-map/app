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

let createStore = require("./Frame/Store/CreateStore").default;

declare global { var store: Store<RootState> & {firebase: FirebaseApp}; }
var store = createStore(g.__InitialState__, {}) as Store<RootState>;
g.Extend({store});

//declare global { var State: ()=>RootState; }
// State() actually also returns the root-state (if no data-getter is supplied), but we don't reveal that in type-info (as its only to be used in console)
g.Extend({State}); declare global {
	function State<T>(pathSegment: ((state: RootState)=>T) | string | number, countAsAccess?: boolean): T;
	function State<T>(pathSegments: (((state: RootState)=>T) | string | number)[], countAsAccess?: boolean): any;
}
function State<T>(pathSegmentOrSegments, countAsAccess = true) {
	let state = store.getState();
	if (pathSegmentOrSegments == null) return state;
	let pathSegments = pathSegmentOrSegments instanceof Array ? pathSegmentOrSegments : [pathSegmentOrSegments];
	if (pathSegments.length == 0) return state;

	let path = pathSegments.map(segment=> {
		return segment instanceof Function ? (segment as any).toString().match(/return a\.(.+?);/)[1].replace(/\./g, "/") : segment;
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