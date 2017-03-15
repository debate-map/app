import {applyMiddleware, compose, createStore} from "redux";
import thunk from "redux-thunk";
import {MakeRootReducer} from "./reducers";
import {createBrowserHistory} from "react-router/node_modules/history";
import {reduxFirebase, getFirebase} from "react-redux-firebase";
import {firebase as fbConfig, reduxFirebase as reduxConfig} from "../config";
import {persistStore, autoRehydrate} from "redux-persist";
//import {version} from "../../package.json";
let {version} = require("../../package.json");

let browserHistory = createBrowserHistory();

export default function(initialState = {}, history) {
	// Window Vars Config
	// ==========
	g.version = version;

	// Middleware Configuration
	// ==========
	const middleware = [
		thunk.withExtraArgument(getFirebase)
		// This is where you add other middleware like redux-observable
	];

	// Store Enhancers
	// ==========
	const enhancers = [];
	if (__DEV__) {
		const devToolsExtension = g.devToolsExtension;
		if (typeof devToolsExtension === "function") {
			enhancers.push(devToolsExtension());
		}
	}

	// Store Instantiation and HMR Setup
	// ==========
	const store = createStore(
		MakeRootReducer(),
		initialState,
		(compose as any)(
			applyMiddleware(...middleware),
			reduxFirebase(fbConfig, reduxConfig),
			autoRehydrate(),
			...enhancers
		)
	) as any;
	store.asyncReducers = {};

	// begin periodically persisting the store
	persistStore(store, {whitelist: ["main"]});

	if (module.hot) {
		module.hot.accept("./reducers", () => {
			const reducers = require("./reducers").MakeRootReducer;
			store.replaceReducer(reducers(store.asyncReducers));
		});
	}

	return store;
}