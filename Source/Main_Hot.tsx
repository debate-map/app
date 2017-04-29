import {ParseModuleData, Require} from "webpack-runtime-require";
import {Store} from "redux";
import {RootState} from "./Store/index";
import {FirebaseApp} from "./Frame/Database/DatabaseHelpers";
import * as ReactDOM from "react-dom";
import * as StackTrace from "stacktrace-js";
import * as React from "react";

// uncomment this if you want to load the source-maps and such ahead of time (making-so the first actual call can get it synchronously)
//StackTrace.get();

let createStore = require(`./Frame/Store/CreateStore`).default;

declare global { var store: Store<RootState> & {firebase: FirebaseApp}; }
var store = createStore(g.__InitialState__, {}) as Store<RootState>;
g.Extend({store});

declare global { var State: ()=>RootState; }
function State() { return store.getState(); }
g.Extend({State});

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