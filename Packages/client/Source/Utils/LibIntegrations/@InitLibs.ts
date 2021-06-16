import firebase from "firebase/app";
import {firebaseConfig} from "Main";
import {ExposeModuleExports, Log} from "web-vcore";
import {InitVWAF} from "./VWAF";
import {InitFeedback} from "./FirebaseFeedback";
import {InitReactJS} from "./ReactJS";
import {InitSentry} from "./Sentry";
import {InitReactVComponents} from "./ReactVComponents";
import {InitServerLink} from "./ServerLink";

// helpers for exposing things (making them easier to access in console/dev-tools)
function ExposeGlobals() {
	// set some globals
	G({Log});
}
function ExposeModuleExports_Final() {
	// expose exports
	if (DEV) {
		setTimeout(()=>{
			ExposeModuleExports();
		}, 500); // wait a bit, since otherwise some modules are missed/empty during ParseModuleData it seems
	} else {
		G({RR: ()=>ExposeModuleExports()});
	}
}

export function InitLibs() {
	InitFirebase();
	InitVWAF();
	InitServerLink(); // init this early, so we can use mobx-graphlink's DBPath() for the later modules (eg. firebase-feedback)
	InitFeedback();
	// InitForum();
	InitSentry();
	InitReactJS();
	InitReactVComponents();

	// start auto-runs, now that store+firelink are initialized (store has not yet loaded data from disk, in RootUIWrapper.ComponentWillMount, but that's fine)
	require("../AutoRuns");

	ExposeGlobals();
	ExposeModuleExports_Final();
}

// minor lib-inits
// ==========

function InitFirebase() {
	// if first run (in firebase-mock/test, or not hot-reloading), initialize the firebase app/sdk
	// if (!firebaseAppIsReal || firebaseApp.apps.length == 0) {
	firebase.initializeApp(firebaseConfig);
}