// "static" imports
import "./Frame/General/Start";
import "./Frame/General/CE";
import "./Frame/Database/DatabaseHelpers";

import * as React from "react";
import {Component as BaseComponent, PropTypes} from "react";
import ReactDOM from "react-dom";
import injectTapEventPlugin from "react-tap-event-plugin";
import {Store} from "redux";
//import {BaseComponent} from "./Frame/UI/ReactGlobals";
import {RootState} from "./store/reducers";
import {GetTimeSinceLoad} from "./Frame/General/Globals_Free";

var JQuery = require("./Frame/JQuery/JQuery3.1.0");
g.Extend({JQuery, jQuery: JQuery});
g.$ = JQuery;

//import createStore from "./store/createStore";
var createStore = require("./store/createStore").default;

declare var process;
if (process.env.NODE_ENV !== "production") {
	// this logs warning if a component doesn't have any props or state change, yet is re-rendered
	const {whyDidYouUpdate} = require("why-did-you-update");
	whyDidYouUpdate(React, {exclude: /connect|Connect|Link|Animate|Animation|Dot|ComposedDataDecorator|Chart|Curve/});
}

// store and history instantiation
// ==========

// Create redux store and sync with react-router-redux. We have installed the
// react-router-redux reducer under the routerKey "router" in src/routes/index.js,
// so we need to provide a custom `selectLocationState` to inform
// react-router-redux of its location.
const initialState = (window as any).___INITIAL_STATE__;
const store = createStore(initialState, {});
g.Extend({store});
declare global { var store: Store<RootState>; }

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
g.Extend({React});

// Tap Plugin
injectTapEventPlugin();

// developer tools setup
// ==========

// this code is excluded from production bundle
declare var __DEV__, module;
if (__DEV__) {
	/*if (window.devToolsExtension)
		window.devToolsExtension.open();*/
	if (module.hot) {
		// setup hot module replacement
		module.hot.accept("./RootUI", () => {
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
	let RootUI = require("./RootUI").default;
	ReactDOM.render(<RootUI store={store}/>, mountNode);
}

//RenderWrapper();
setTimeout(()=> {
	RenderWrapper();
});