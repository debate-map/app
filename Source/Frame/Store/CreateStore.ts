import {applyMiddleware, compose, createStore, StoreEnhancer, Store} from "redux";
import thunk from "redux-thunk";
import {reduxFirebase, getFirebase} from "react-redux-firebase";
import {DBPath} from "../../Frame/Database/DatabaseHelpers";
import {persistStore, autoRehydrate} from "redux-persist";
import {createFilter, createBlacklistFilter} from "redux-persist-transform-filter";
import {MakeRootReducer, RootState} from "../../Store/index";
import watch from "redux-watch";
import {PreDispatchAction, MidDispatchAction, PostDispatchAction} from "./ActionProcessor";
//import {version, firebaseConfig} from "../../BakedConfig";
//var {version, firebaseConfig} = require(prodEnv ? "../../BakedConfig_Prod" : "../../BakedConfig_Dev");
//import {batchedUpdatesMiddleware} from "redux-batched-updates";
import {batchedSubscribe} from "redux-batched-subscribe";
import {unstable_batchedUpdates} from "react-dom";
import {routerForBrowser} from 'redux-little-router';

let routes = {
	"/": {},
	"/:seg": {},
	"/:seg/:seg": {},
	"/:seg/:seg/:seg": {},
	"/:seg/:seg/:seg/:seg": {},
	"/:seg/:seg/:seg/:seg/:seg": {},
};
const {reducer: routerReducer, middleware: routerMiddleware, enhancer: routerEnhancer} = routerForBrowser({
  routes,
});

//export const browserHistory = createBrowserHistory();
//import {browserHistory} from "react-router";

export default function(initialState = {}, history) {
	// Window Vars Config
	// ==========
	g.version = version;

	// Middleware Configuration
	// ==========
	const middleware = [
		thunk.withExtraArgument(getFirebase),
		// for some reason, this breaks stuff if we have it the last one
		/*store=>next=>action=> {
			Log("What!" + action.type);
			PreDispatchAction(action);
			const returnValue = next(action);
			MidDispatchAction(action, returnValue);
			WaitXThenRun(0, ()=>PostDispatchAction(action));
			return returnValue;
		},*/
		//routerMiddleware(browserHistory),
		routerMiddleware,
	];
	let lateMiddleware = [
		// for some reason, this breaks stuff if we have it the last one
		store=>next=>action=> {
			PreDispatchAction(action); if (action.type == "ApplyActionSet") for (let sub of action.actions) PreDispatchAction(sub);
			const returnValue = next(action);
			MidDispatchAction(action, returnValue); if (action.type == "ApplyActionSet") for (let sub of action.actions) MidDispatchAction(sub, returnValue);
			WaitXThenRun(0, ()=> {
				PostDispatchAction(action); if (action.type == "ApplyActionSet") for (let sub of action.actions) PostDispatchAction(sub);
			});
			return returnValue;
		},
	];

	// Store Enhancers
	// ==========
	const extraEnhancers = [];
	//if (devEnv) {
	const devToolsExtension = g.devToolsExtension;
	if (typeof devToolsExtension === "function") {
		//enhancers.push(devToolsExtension());
		//extraEnhancers.push(devToolsExtension({maxAge: 100}));
		extraEnhancers.push(devToolsExtension({maxAge: 70}));
	}
	//}

	// Store Instantiation and HMR Setup
	// ==========

	//reduxConfig["userProfile"] = DBPath("users"); // root that user profiles are written to
	let reduxFirebaseConfig = {
		userProfile: DBPath("users"), // root that user profiles are written to
		enableLogging: false, // enable/disable Firebase Database Logging
		updateProfileOnLogin: false // enable/disable updating of profile on login
		// profileDecorator: (userData) => ({ email: userData.email }) // customize format of user profile
	};

	let extraReducers = {
		router: routerReducer,
	};
	const store = createStore(
		MakeRootReducer(extraReducers),
		initialState,
		// note: compose applies functions from right to left
		compose(
			routerEnhancer,
			applyMiddleware(...middleware),
			reduxFirebase(firebaseConfig, reduxFirebaseConfig),
			autoRehydrate(),
			batchedSubscribe(unstable_batchedUpdates),
			applyMiddleware(...lateMiddleware), // place late-middleware after reduxFirebase, so it can intercept all its dispatched events
			...extraEnhancers
		) as StoreEnhancer<any>
	) as Store<RootState>; //& {extraReducers};

	/*let w = watch(()=>State());
	store.subscribe(w((newVal, oldVal) => {
		ProcessAction(g.lastAction, newVal, oldVal);
	}));*/

	// begin periodically persisting the store
	//let persister = persistStore(store, {whitelist: ["main"]});
	// you want to remove some keys before you save
	let persister = persistStore(store, {
		whitelist: ["main"],
		transforms: [
			createBlacklistFilter("main", ["notificationMessages"])
		]
	}, ()=>g.storeRehydrated = true);
	if (startURL.GetQueryVar("clearState")) {
		Log("Clearing redux-store's state...");
		persister.purge();
	}

	if (module.hot) {
		module.hot.accept("../../Store", () => {
			let {MakeRootReducer} = require("../../Store");
			store.replaceReducer(MakeRootReducer(extraReducers));
		});
	}

	return store;
}