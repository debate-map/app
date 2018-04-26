import {applyMiddleware, compose, createStore, StoreEnhancer, Store} from "redux";
import thunk from "redux-thunk";
import {DBPath} from "../../Frame/Database/DatabaseHelpers";
import {persistStore, persistReducer} from "redux-persist";
import {createFilter, createBlacklistFilter} from "redux-persist-transform-filter";
import {MakeRootReducer, RootState} from "../../Store/index";
import watch from "redux-watch";
import {PreDispatchAction, MidDispatchAction, PostDispatchAction} from "./ActionProcessor";
//import {version, firebaseConfig} from "../../BakedConfig";
//var {version, firebaseConfig} = require(prodEnv ? "../../BakedConfig_Prod" : "../../BakedConfig_Dev");
//import {batchedUpdatesMiddleware} from "redux-batched-updates";
import {batchedSubscribe} from "redux-batched-subscribe";
import {unstable_batchedUpdates} from "react-dom";
import {routerForBrowser} from "redux-little-router";

import firebase_ from "firebase";
import { reactReduxFirebase, firebaseReducer } from "react-redux-firebase";
//import { reduxFirestore, firestoreReducer } from "redux-firestore";
//import "firebase/firestore";

let firebase = firebase_ as any;

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
		//thunk.withExtraArgument(getFirebase),
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

	// redux-dev-tools config
	// ==========

	let reduxDevToolsConfig = {
		maxAge: 70,
		/*actionSanitizer: action=> {
			function Sanitize(action) {
				if (action.type == "@@reactReduxFirebase/SET" && action.path.startsWith(DBPath("nodes"))) {
					return {...action, data: "<<IGNORED>>"};
				}
				return action;
			}
			if (action.type == "ApplyActionSet") {
				return {...action, actions: action.actions.map(a=>Sanitize(a))};
			}
			return Sanitize(action);
		},
		stateSanitizer: action=> {
			function Sanitize(action) {
				if (action.type == "@@reactReduxFirebase/SET" && action.path.startsWith(DBPath("nodes"))) {
					return {...action, data: "<<IGNORED>>"};
				}
				return action;
			}
			if (action.type == "ApplyActionSet") {
				return {...action, actions: action.actions.map(a=>Sanitize(a))};
			}
			return Sanitize(action);
		},*/
		/*serialize: {
			replacer: (key, value)=> {
				// ignore "nodes" subtree
				if (value && value.currentRevision) return "<<IGNORED>>";
				//if (value && value.currentRevision) return {data: "<<IGNORED>>"};
				return value;
			},
			reviver: (key, value)=> {
				// ignore "nodes" subtree
				if (value && value.currentRevision) return "<<IGNORED>>";
				return value;
			},
		},*/
		/*actionsFilter: (action) => (action.places ? Object.assign(action, { places: [] }) : action),
 		statesFilter: (state) => (state.places ? Object.assign(state, {places: [] }) : state)*/
	};

	// Store Instantiation and HMR Setup
	// ==========

	//reduxConfig["userProfile"] = DBPath("users"); // root that user profiles are written to
	let reduxFirebaseConfig = {
		userProfile: DBPath("users"), // root that user profiles are written to
		enableLogging: false, // enable/disable Firebase Database Logging
		updateProfileOnLogin: false, // enable/disable updating of profile on login
		// profileDecorator: (userData) => ({ email: userData.email }) // customize format of user profile
		useFirestoreForProfile: true,
	};
	if (firebase.apps.length == 0) {
		firebase.initializeApp(firebaseConfig);
	}
	//g.firestoreDB = firebase.firestore(); // can also use store.firebase.firestore()

	let extraReducers = {
		router: routerReducer,
	};
	const store = createStore(
		MakeRootReducer(extraReducers),
		initialState,
		// Note: Compose applies functions from right to left: compose(f, g, h) = (...args)=>f(g(h(...args))).
		// You can think of the earlier ones as "wrapping" and being able to "monitor" the ones after it, but (usually) telling them "you apply first, then I will".
		compose(...[
			//autoRehydrate({log: true}),
			routerEnhancer,
			applyMiddleware(...middleware),
			reactReduxFirebase(firebase, reduxFirebaseConfig),
			batchedSubscribe(unstable_batchedUpdates),
			applyMiddleware(...lateMiddleware), // place late-middleware after reduxFirebase, so it can intercept all its dispatched events
			g.devToolsExtension && g.devToolsExtension(reduxDevToolsConfig),
		].filter(a=>a)) as StoreEnhancer<any>
	) as Store<RootState>; //& {extraReducers};

	function Dispatch_WithStack(action) {
		if (g.actionStacks || (devEnv && !actionStacks_actionTypeIgnorePatterns.Any(a=>action.type.startsWith(a)))) {
			action["stack"] = new Error().stack.split("\n").slice(1); // add stack, so we can inspect in redux-devtools
		}
		store["dispatch_orig"](action);
	}
	if (store.dispatch != Dispatch_WithStack) {
		store["dispatch_orig"] = store.dispatch;
		store.dispatch = Dispatch_WithStack;
	}
	const actionStacks_actionTypeIgnorePatterns = [
		"@@reactReduxFirebase/", // ignore redux actions
	];

	/*let w = watch(()=>State());
	store.subscribe(w((newVal, oldVal) => {
		ProcessAction(g.lastAction, newVal, oldVal);
	}));*/

	// begin periodically persisting the store
	//let persister = persistStore(store, {whitelist: ["main"]});
	// you want to remove some keys before you save
	//let persister = persistStore(store, null, ()=>g.storeRehydrated = true);
	let persister = persistStore(store);
	if (startURL.GetQueryVar("clearState")) {
		Log("Clearing redux-store's state and local-storage...");
		persister.purge();
		//localStorage.clear();
		for (let key in localStorage) {
			if (key.startsWith("firebase:")) continue; // keep auth-info
			delete localStorage[key];
		}
	}

	if (__DEV__) {
		if (module.hot) {
			module.hot.accept("../../Store", () => {
				let {MakeRootReducer} = require("../../Store");
				(store as any).reducer = MakeRootReducer(extraReducers);
				store.replaceReducer((store as any).reducer);
			});
		}
	}

	return {store, persister};
}