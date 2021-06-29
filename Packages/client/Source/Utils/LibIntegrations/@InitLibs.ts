import {ExposeModuleExports, Log} from "web-vcore";
import {InitWVC} from "./WVC.js";
import {InitReactJS} from "./ReactJS.js";
import {InitSentry} from "./Sentry.js";
import {InitReactVComponents} from "./ReactVComponents.js";
import {InitGraphlink} from "./MobXGraphlink.js";
import {InitPGLink} from "./PGLink.js";
import {WRR} from "web-vcore/node_modules/webpack-runtime-require";

// helpers for exposing things (making them easier to access in console/dev-tools)
function ExposeGlobals() {
	// set some globals
	G({Log});
}
function ExposeModuleExports_Final() {
	// expose exports
	if (DEV) {
		setTimeout(()=>{
			const wrr = ExposeModuleExports();
			//FixStoreAccessorFuncNames(wrr);
		}, 500); // wait a bit, since otherwise some modules are missed/empty during ParseModuleData it seems
	} else {
		G({RR: ()=>{
			const wrr = ExposeModuleExports();
			//FixStoreAccessorFuncNames(wrr);
			return wrr.moduleExports_flat;
		}});
	}
}
// not needed; NPMPatches.ts in web-vcore already passes the store-accessor-funcs their names
/*function FixStoreAccessorFuncNames(wrr: WRR) {
	for (const [exportName, exportValue] of Object.entries(wrr.moduleExports["dm_common"])) {
		// if module-export is one of the store-accessor-funcs, without a name specified
		if (exportValue instanceof Function && exportValue.name == "[name missing]") {
			// set the store-accessor-func's name to the export-name
			Object.defineProperty(exportValue, "name", {value: exportName})
		}
	}
}*/

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