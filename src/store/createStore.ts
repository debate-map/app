import {applyMiddleware, compose, createStore} from "redux";
import thunk from "redux-thunk";
import {MakeRootReducer} from "./Root";
import {createBrowserHistory} from "react-router/node_modules/history";
import {reduxFirebase, getFirebase} from "react-redux-firebase";
import {firebase as fbConfig} from "../config";
import {persistStore, autoRehydrate} from "redux-persist";
//import createFilter from "redux-persist-transform-filter";
//import {version} from "../../package.json";
import {GetUrlVars} from "../Frame/General/Globals_Free";
import {DBPath} from "../Frame/Database/DatabaseHelpers";
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
		(compose as any)(
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
		module.hot.accept("./Root", () => {
			const reducers = require("./Root").MakeRootReducer;
			store.replaceReducer(reducers(store.asyncReducers));
		});
	}

	return store;
}