// "static" imports
//type __ = typeof import("js-vextensions/Helpers/@ApplyCETypes");
import "./Utils/PreRunners/Start_0";
//import "babel-polyfill";
import "web-vcore/nm/webpack-runtime-require";
import "./Utils/ClassExtensions/CE_General";
import "./Utils/PreRunners/Start_1";
import "web-vcore/nm/codemirror";
import "web-vcore/nm/@opt/codemirror_deep_simplescrollbars";
import "./Utils/UI/CodeMirrorConfig";
// needed to fix odd ts issue (where, if first "import" call for library is in wvc, all subsequent imports of it are assumed to be referencing that under-wvc version)
import "web-vcore/nm/mobx-graphlink";

import {VURL} from "web-vcore/nm/js-vextensions.js";
import {RootState} from "Store";

// startup (non-hot)
// ==========

export const JustBeforeInitLibs_listeners = [] as (()=>any)[];
export function JustBeforeInitLibs(listener: ()=>any) { JustBeforeInitLibs_listeners.push(listener); }

export const JustBeforeUI_listeners = [] as (()=>any)[];
export function JustBeforeUI(listener: ()=>any) { JustBeforeUI_listeners.push(listener); }

/*declare const __webpack_require__;
g.webpackData = __webpack_require__;*/

const startURL = VURL.Parse(window.location.href);
declare global { export const startURL: VURL; } G({startURL});

let storeTemp = {} as RootState;
try {
	const storeTemp_json = localStorage.__mobx_sync__;
	if (storeTemp_json) {
		try { // defensive
			storeTemp = JSON.parse(storeTemp_json);
		} catch (ex) {}
	}
} catch (ex) {
	if (prompt(
		"Debate Map failed to load map-data from local-storage; site cannot function until local-storage is re-enabled.\n\n"
		+ "If Debate Map is loaded in an iframe, you can most likely solve this by disabling the \"Block third-party cookies\" option in Chrome's incognito-mode new-tab, then refreshing.\n\n"
		+ "For more info, you can copy and visit the link below.",
		"https://stackoverflow.com/a/69004255",
	)) {
		// commented; modern browsers block this auto-navigation, so best to just leave it up to the user
		/*try {
			if (window.top) window.top.location.href = "https://stackoverflow.com/a/69004255";
		} catch (ex) {
			alert("Navigation to information page failed. To view it, you can refresh the page, then manually copy and visit the link.");
		}*/
	}
}
function AsNotNull(val: any) {
	if (val == null || val == "null") return null;
	return val;
}

// always compile-time
declare global { var ENV_COMPILE_TIME: string; }
// only compile-time if compiled for production (otherwise, can be overriden)
declare global { var ENV: string; var DEV: boolean; var PROD: boolean; var TEST: boolean; }

// if environment at compile time was not "prod" (ie. if these globals weren't set/locked), then set them here at runtime
if (ENV_COMPILE_TIME != "prod") {
	g.ENV = ENV_COMPILE_TIME;
	const envStr = AsNotNull(startURL.GetQueryVar("env")) || storeTemp.main?.envOverride;
	if (envStr) {
		g.ENV = {dev: "dev", prod: "prod"}[envStr] || envStr;
		// alert("Using env: " + g.ENV);
		console.log(`Using env: ${ENV}`);
	}

	g.DEV = ENV == "dev";
	g.PROD = ENV == "prod";
	g.TEST = ENV == "test";
} else {
	// else, turn the compile-time replacements into true globals
	// NOTE: Do NOT "simplify" these to just {X, Y, Z}, else it breaks the compile-time replacement.
	Object.assign(g, { ENV: ENV, DEV: DEV, PROD: PROD, TEST: TEST }); // eslint-disable-line
}

// only compile-time if compiled for production (otherwise, can be overriden)
declare global { var DB: string; var DB_SHORT: string; }

g.DB = g.ENV;
if (location.host == "localhost:5100" || location.host == "localhost:5101") {
	g.DB = "dev";
}
const dbStr = AsNotNull(startURL.GetQueryVar("db")) || storeTemp.main?.dbOverride;
if (dbStr) {
	g.DB = {dev: "dev", prod: "prod"}[dbStr] || dbStr;
	console.log(`Using db: ${DB}`);
}
g.DB_SHORT = {development: "dev", production: "prod"}[DB] || DB;

/*let dbVersion = 12;
const dbVersionStr = AsNotNull(startURL.GetQueryVar("dbVersion")) || storeTemp.main?.dbVersionOverride;
if (dbVersionStr) {
	dbVersion = parseInt(dbVersionStr);
	console.log(`Using dbVersion: ${dbVersion}`);
}
export {dbVersion};*/
// G({version, dbVersion, firebaseConfig}); declare global { var version: string, dbVersion: number, firebaseConfig; }

// hot-reloading
// ==========

/* let hotReloading = false;
G({hotReloading}); declare global { let hotReloading: boolean; } */
export const hasHotReloaded = false;

// this code is excluded from production bundle
/* if (DEV) {
	/* if (window.devToolsExtension)
		window.devToolsExtension.open(); *#/
	if (module['hot']) {
		// setup hot module replacement
		module['hot'].accept('./Main_Hot', () => {
			hasHotReloaded = true;
			setTimeout(() => {
				ReactDOM.unmountComponentAtNode(document.getElementById('root'));
				LoadHotModules();
			});
		});
		module['hot'].accept('./Store', () => {
			const { MakeRootReducer } = require('./Store');
			store.reducer = MakeRootReducer();
			store.replaceReducer(store.reducer);
		});
	}
} */

function LoadHotModules() {
	// Log("Reloading hot modules...");
	require("./Main_Hot");
}

// delay useful for, eg. letting mobx dev-tools load before page loads
if (DEV && startURL.GetQueryVar("delay")) {
	setTimeout(()=>LoadHotModules(), parseFloat(startURL.GetQueryVar("delay")!) * 1000);
} else {
	LoadHotModules();
}