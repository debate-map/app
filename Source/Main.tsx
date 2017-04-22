// "static" imports
import "babel-polyfill";
import "webpack-runtime-require";
//import {Require} from "webpack-runtime-require";
import "./Frame/General/EarlyStart";
import "./Frame/General/CE";

import ReactDOM from "react-dom";
import {Store} from "redux";
import {RootState} from "./Store/index";
import {FirebaseApp} from "./Frame/Database/DatabaseHelpers";
import {GetUrlVars, CurrentUrl, URL} from "./Frame/General/URLs";
import Raven from "raven-js";
import injectTapEventPlugin from "react-tap-event-plugin";
import * as React from "react";
//import Promise from "bluebird";

// startup (non-hot)
// ==========

declare global { function G(...globalHolders); } g.Extend({G});
function G(...globalHolders) {
	for (let globalHolder of globalHolders)
		g.Extend(globalHolder);
}

import JQuery from "./Frame/JQuery/JQuery3.1.0";
G({JQuery, jQuery: JQuery});
g.$ = JQuery;

G({React});

//g.Extend({Promise});
/*function PromiseWrapper(...args) {
	//let promise = Promise.apply(this, ...args);
	let promise = new Promise(...args);

	//promise._setAsyncGuaranteed(false);
    //this._bitField = this._bitField | 134217728;
    promise._bitField = promise._bitField & (~134217728);
	return promise;
}
for (var key in Promise)
	PromiseWrapper[key] = Promise[key];
g.Extend({React, Promise: PromiseWrapper});*/

// Tap Plugin
injectTapEventPlugin();

let startURL = URL.Current();
g.Extend({startURL}); declare global { export var startURL: URL; }

//let {version} = require("../../../package.json");
// use two BakedConfig files, so that dev-server can continue running, with its own baked-config data, even while prod-deploy occurs
let {version, env, devEnv, prodEnv, testEnv} = __DEV__ ? require("./BakedConfig_Dev") : require("./BakedConfig_Prod");
//let version = "0.0.1", env = "development", devEnv = true, prodEnv = false, testEnv = false;
if (startURL.GetQueryVar("env") && startURL.GetQueryVar("env") != "null") {
	env = startURL.GetQueryVar("env");
	devEnv = env == "development";
	prodEnv = env == "production";
	testEnv = env == "test";
	//alert("Using env: " + env);
	console.log("Using env: " + env);
}
g.Extend({env, devEnv, prodEnv, testEnv});

if (prodEnv) {
	Raven.config("https://40c1e4f57e8b4bbeb1e5b0cf11abf9e9@sentry.io/155432", {
		release: version,
		environment: env,
	}).install();
}

if (devEnv) {
	// this logs warning if a component doesn't have any props or state change, yet is re-rendered
	const {whyDidYouUpdate} = require("why-did-you-update");
	whyDidYouUpdate(React, {
		exclude: new RegExp(
			`connect|Connect|Link`
			+ `|Animate|Animation|Dot|ComposedDataDecorator|Chart|Curve|Route|ReferenceLine|Text` // from recharts
			+ `|Div` // from ScrollView (probably temp)
			+ `|Button` // from react-social-button>react-bootstrap
		),
	});
}

// hot-reloading
// ==========

// this code is excluded from production bundle
if (__DEV__) {
	/*if (window.devToolsExtension)
		window.devToolsExtension.open();*/
	if (module.hot) {
		// setup hot module replacement
		module.hot.accept("./Main_Hot", () => {
			setTimeout(()=> {
				ReactDOM.unmountComponentAtNode(document.getElementById("root"));
				LoadHotModules();
			});
		});
	}
}

function LoadHotModules() {
	//Log("Reloading hot modules...");
	require("./Main_Hot");
}

//setTimeout(()=>LoadHotModules());
LoadHotModules();