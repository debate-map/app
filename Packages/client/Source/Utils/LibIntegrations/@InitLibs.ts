import {ExposeModuleExports, Log} from "web-vcore";
import {InitWVC} from "./WVC";
import {InitReactJS} from "./ReactJS";
import {InitSentry} from "./Sentry";
import {InitReactVComponents} from "./ReactVComponents";
import {InitGraphlink} from "./MobXGraphlink";
import {InitPGLink} from "./PGLink";

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
	InitPGLink();
	//InitFirebase();
	InitWVC();
	InitGraphlink(); // init this early, so we can use mobx-graphlink's DBPath() for the later modules (eg. graphql-feedback)
	//InitFeedback();
	//InitForum();
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

/*function InitFirebase() {
	// if first run (in firebase-mock/test, or not hot-reloading), initialize the firebase app/sdk
	// if (!firebaseAppIsReal || firebaseApp.apps.length == 0) {
	firebase.initializeApp(firebaseConfig);
}*/