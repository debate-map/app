import {applyMiddleware, compose, createStore} from "redux";
import thunk from "redux-thunk";
import {createBrowserHistory} from "react-router/node_modules/history";
import {reduxFirebase, getFirebase} from "react-redux-firebase";
import {firebase as fbConfig} from "../../config";
import {DBPath} from "../../Frame/Database/DatabaseHelpers";
import {persistStore, autoRehydrate} from "redux-persist";
//import createFilter from "redux-persist-transform-filter";
//import {version} from "../../package.json";
import {routerMiddleware} from 'react-router-redux'
import {GetUrlVars} from "../General/Globals_Free";
import {MakeRootReducer} from "../../Store/index";
let {version} = require("../../../package.json");
export const browserHistory = createBrowserHistory();

export default function(initialState = {}, history) {
	// Window Vars Config
	// ==========
	g.version = version;

	// Middleware Configuration
	// ==========
	const middleware = [
		thunk.withExtraArgument(getFirebase),
		routerMiddleware(browserHistory)
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

	//reduxConfig["userProfile"] = DBPath("users"); // root that user profiles are written to
	let reduxFirebaseConfig = {
		userProfile: DBPath("users"), // root that user profiles are written to
		enableLogging: false, // enable/disable Firebase Database Logging
		updateProfileOnLogin: false // enable/disable updating of profile on login
		// profileDecorator: (userData) => ({ email: userData.email }) // customize format of user profile
	};

	const store = createStore(
		MakeRootReducer(),
		initialState,
		compose(
			applyMiddleware(...middleware),
			reduxFirebase(fbConfig, reduxFirebaseConfig),
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
		module.hot.accept("../../Store", () => {
			const reducers = require("../../Store").MakeRootReducer;
			store.replaceReducer(reducers(store.asyncReducers));
		});
	}

	return store;
}