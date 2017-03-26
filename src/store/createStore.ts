import {applyMiddleware, compose, createStore} from "redux";
import thunk from "redux-thunk";
import {MakeRootReducer} from "./Root";
import {createBrowserHistory} from "react-router/node_modules/history";
import {reduxFirebase, getFirebase} from "react-redux-firebase";
import {firebase as fbConfig, reduxFirebase as reduxConfig} from "../config";
import {persistStore, autoRehydrate} from "redux-persist";
//import createFilter from "redux-persist-transform-filter";
//import {version} from "../../package.json";
import {GetUrlVars} from "../Frame/General/Globals_Free";
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
	let persister = persistStore(store, {whitelist: ["main"]});
	// you want to remove some keys before you save
	/*const saveSubsetBlacklistFilter = createBlacklistFilter(
		"main",
		["keyYouDontWantToSave1", "keyYouDontWantToSave2"]
	);
	persistStore(store, {
		transforms: [saveSubsetBlacklistFilter]
	});*/
	if (GetUrlVars().clearState)
		persister.purge();

	if (module.hot) {
		module.hot.accept("./Root", () => {
			const reducers = require("./Root").MakeRootReducer;
			store.replaceReducer(reducers(store.asyncReducers));
		});
	}

	return store;
}