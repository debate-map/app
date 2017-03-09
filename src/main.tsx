// special, early imports
import "./Frame/General/Start";
import "./Frame/General/CE";

var JQuery = require("./Frame/JQuery/JQuery3.1.0");
g.Extend({JQuery, jQuery: JQuery});
g.$ = JQuery;

import ReactDOM from "react-dom";
import createStore from "./store/createStore";

// store and history instantiation
// ==========

// Create redux store and sync with react-router-redux. We have installed the
// react-router-redux reducer under the routerKey "router" in src/routes/index.js,
// so we need to provide a custom `selectLocationState` to inform
// react-router-redux of its location.
const initialState = (window as any).___INITIAL_STATE__;
const store = createStore(initialState, {});

// wrapper ui
// ==========

//import {Component, PropTypes} from "react";
import * as React from "react";
g.React = React;
import {Component as BaseComponent, PropTypes} from "react";

// Tap Plugin
import injectTapEventPlugin from "react-tap-event-plugin";
//import {BaseComponent} from "./Frame/UI/ReactGlobals";
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
RenderWrapper();