// "static" imports
//type __ = typeof import("js-vextensions/Helpers/@ApplyCETypes");
import "./Utils/PreRunners/Start_0.js";
//import "babel-polyfill";
import "web-vcore/nm/webpack-runtime-require";
import "./Utils/ClassExtensions/CE_General.js";
import "./Utils/PreRunners/Start_1.js";
import "web-vcore/nm/codemirror";
import "web-vcore/nm/@opt/codemirror_deep_simplescrollbars";
import "./Utils/UI/CodeMirrorConfig.js";
// needed to fix odd ts issue (where, if first "import" call for library is in wvc, all subsequent imports of it are assumed to be referencing that under-wvc version)
import "web-vcore/nm/mobx-graphlink.js";

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

// When running in iframe, and 3rd-party cookies are blocked (ie. chrome incognito default), at least allow page to load by polyfilling "localStorage" with transient/in-memory storage.
// For more info, see: "https://stackoverflow.com/a/69004255" (as well as: https://bugs.chromium.org/p/chromium/issues/detail?id=357625)
function HasLocalStorage() {
	try {
		localStorage.setItem("test", "test");
		localStorage.removeItem("test");
		return true;
	} catch (e) {
		return false;
	}
}
if (!HasLocalStorage()) {
	Object.defineProperty(window, "localStorage", {
		value: {
			_data: {},
			setItem(id, val) { return this._data[id] = String(val); },
			getItem(id) { return this._data.hasOwnProperty(id) ? this._data[id] : undefined; },
			removeItem(id) { return delete this._data[id]; },
			clear() { return this._data = {}; },
		},
	});
}

let storeTemp = {} as RootState;
try {
	const storeTemp_json = localStorage.__mobx_sync__;
	if (storeTemp_json) {
		try { // defensive
			storeTemp = JSON.parse(storeTemp_json);
		} catch (ex) {}
	}
}
// if "localStorage" is blocked, and something went wrong with our polyfill of it above, show an error message to user
catch (ex) {
	if (prompt(
		"Debate Map failed to load map-data from local-storage; site cannot function without local-storage enabled.\n\n"
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

// these props get compile-time-replaced (for dead-code-elimination); we never actually add these onto `globalThis`, but we declare them here, so intellisense shows it as option
declare global { var ENV: string; var DEV: boolean; var PROD: boolean; var TEST: boolean; }
// these props do not get compile-time-replaced; these are intentionally able to be modified at runtime (eg. in dev-tools console, or with url flags), eg. to enable/disable certain profiling-data collection
declare global { var ENV_DYN: string; var ENV_DYN_ORIG: string; var DEV_DYN: boolean; var PROD_DYN: boolean; var TEST_DYN: boolean; }

// start by loading the "X_DYN" vars from the compile-time insertions
Object.assign(g, {ENV_DYN: ENV, ENV_DYN_ORIG: ENV, DEV_DYN: DEV, PROD_DYN: PROD, TEST_DYN: TEST});

// now, check the URL and store for potential user-overrides of the "X_DYN" derivative-vars (eg. the subset of env-references that opt-in to allowing runtime overrides)
const envStr = AsNotNull(startURL.GetQueryVar("env")) || storeTemp.main?.envOverride;
if (envStr) {
	console.log(`Using env: ${ENV}`);
	const newEnv = {dev: "dev", prod: "prod"}[envStr] || envStr;
	g.ENV = newEnv;
	g.DEV = newEnv == "dev";
	g.PROD = newEnv == "prod";
	g.TEST = newEnv == "test";
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
	// eslint-disable-next-line global-require
	require("./Main_Hot.js");
}

// delay useful for, eg. letting mobx dev-tools load before page loads
if (DEV && startURL.GetQueryVar("delay")) {
	setTimeout(()=>LoadHotModules(), parseFloat(startURL.GetQueryVar("delay")!) * 1000);
} else {
	LoadHotModules();
}