// "static" imports
import "webpack-runtime-require";
//import {Require} from "webpack-runtime-require";
import "./Frame/General/Start";
import "./Frame/General/CE";
import "./Frame/Database/DatabaseHelpers";

import * as React from "react";
import {Component as BaseComponent, PropTypes} from "react";
import ReactDOM from "react-dom";
import injectTapEventPlugin from "react-tap-event-plugin";
import {Store} from "redux";
import {GetTimeSinceLoad} from "./Frame/General/Globals_Free";

import {RootState} from "./Store/index";
import {FirebaseApplication} from "firebase";
import Raven from "raven-js";

var JQuery = require("./Frame/JQuery/JQuery3.1.0");
g.Extend({JQuery, jQuery: JQuery});
g.$ = JQuery;

//let {version} = require("../../../package.json");
import {version, env, devEnv, prodEnv, testEnv} from "./BakedConfig";
g.Extend({env, devEnv, prodEnv, testEnv});

Raven.config("https://40c1e4f57e8b4bbeb1e5b0cf11abf9e9@sentry.io/155432", {
	release: version,
	environment: env,
}).install();

//import createStore from "./Store/createStore";
var createStore = require("./Frame/Store/CreateStore").default;

if (devEnv) {
	// this logs warning if a component doesn't have any props or state change, yet is re-rendered
	const {whyDidYouUpdate} = require("why-did-you-update");
	whyDidYouUpdate(React, {
		exclude: new RegExp(
			`connect|Connect|Link`
			+ `|Animate|Animation|Dot|ComposedDataDecorator|Chart|Curve|Route` // from recharts
			+ `|Div` // from ScrollView (probably temp)
			+ `|Button` // from react-bootstrap (from react-social-button)
		),
	});
}

// store and history instantiation
// ==========

// Create redux store and sync with react-router-redux. We have installed the
// react-router-redux reducer under the routerKey "router" in [?],
// so we need to provide a custom `selectLocationState` to inform
// react-router-redux of its location.
const initialState = (window as any).___INITIAL_STATE__;

var store;
declare global { var store: Store<RootState> & {firebase: FirebaseApp}; }
function CreateStore() {
	store = createStore(initialState, {}) as Store<RootState>;
	g.Extend({store});
}

function State() {
	return store.getState();
}
g.Extend({State});
declare global { var State: ()=>RootState; }

/*function GetState() {
	return (store as Store<RootState>).getState().As(RootState);
}
g.Extend({GetState});
declare global { function GetState(): RootState; }*/

// use this to intercept dispatches (for debugging)
/*let oldDispatch = store.dispatch;
store.dispatch = function(...args) {
	if (GetTimeSinceLoad() > 5)
		debugger;
	oldDispatch.apply(this, args);
};*/

// wrapper ui
// ==========

//import {Component, PropTypes} from "react";
import {FirebaseApp} from "./Frame/Database/DatabaseHelpers";
g.Extend({React});

// Tap Plugin
injectTapEventPlugin();

// developer tools setup
// ==========

// this code is excluded from production bundle
if (devEnv) {
	/*if (window.devToolsExtension)
		window.devToolsExtension.open();*/
	if (module.hot) {
		// setup hot module replacement
		module.hot.accept("./UI/Root", () => {
			setTimeout(()=> {
				ReactDOM.unmountComponentAtNode(mountNode);
				RenderWrapper();
			});
		});
	}
}

// go!
// ==========

const mountNode = document.getElementById("root");
function RenderWrapper() {
	let RootUIWrapper = require("./UI/Root").default;
	ReactDOM.render(<RootUIWrapper store={store}/>, mountNode);
}

CreateStore();
//RenderWrapper();
setTimeout(()=> {
	RenderWrapper();
});