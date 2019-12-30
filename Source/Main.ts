// "static" imports
//type __ = typeof import("js-vextensions/Helpers/@ApplyCETypes");
import "./Utils/PreRunners/Start_0";
import "babel-polyfill";
import "webpack-runtime-require";
import "./Utils/ClassExtensions/CE_General";
import "./Utils/PreRunners/Start_1";
import "codemirror";
import "codemirror/addon/scroll/simplescrollbars";
import "./Utils/UI/CodeMirrorConfig";
// needed to fix odd ts issue (where, if first "import" call for library is in vwaf, all subsequent imports of it are assumed to be referencing that under-vwaf version)
import "mobx-firelink";

import ReactDOM from "react-dom";
// import Promise from "bluebird";
import {VURL} from "js-vextensions";

// startup (non-hot)
// ==========

export const JustBeforeInitLibs_listeners = [];
export function JustBeforeInitLibs(listener: ()=>any) { JustBeforeInitLibs_listeners.push(listener); }

export const JustBeforeUI_listeners = [];
export function JustBeforeUI(listener: ()=>any) { JustBeforeUI_listeners.push(listener); }

declare const __webpack_require__;
g.webpackData = __webpack_require__;

const startURL = VURL.Parse(window.location.href);
declare global { export const startURL: VURL; } G({startURL});

// always compile-time
declare global { var ENV_COMPILE_TIME: string; }
// only compile-time if compiled for production (otherwise, can be overriden)
declare global { var ENV: string; var DEV: boolean; var PROD: boolean; var TEST: boolean; }

// if environment at compile time was not "production" (ie. if these globals weren't set/locked), then set them here at runtime
if (ENV_COMPILE_TIME != "production") {
	g.ENV = ENV_COMPILE_TIME;
	if (startURL.GetQueryVar("env") && startURL.GetQueryVar("env") != "null") {
		const envStr = startURL.GetQueryVar("env");
		g.ENV = {dev: "development", prod: "production"}[envStr] || envStr;
		// alert("Using env: " + g.ENV);
		console.log(`Using env: ${ENV}`);
	}

	g.DEV = ENV == "development";
	g.PROD = ENV == "production";
	g.TEST = ENV == "test";
} else {
	// else, turn the compile-time replacements into true globals
	// NOTE: Do NOT "simplify" these to just {X, Y, Z}, else it breaks the compile-time replacement.
	Object.assign(g, { ENV: ENV, DEV: DEV, PROD: PROD, TEST: TEST }); // eslint-disable-line
}

// only compile-time if compiled for production (otherwise, can be overriden)
declare global { var DB: string; var DB_SHORT: string; }

g.DB = g.ENV;
if (startURL.GetQueryVar("db") && startURL.GetQueryVar("db") != "null") {
	const dbStr = startURL.GetQueryVar("db");
	g.DB = {dev: "development", prod: "production"}[dbStr] || dbStr;
	console.log(`Using db: ${DB}`);
}
g.DB_SHORT = {development: "dev", production: "prod"}[DB] || DB;

// let {version} = require("../../../package.json");
// Note: Use two BakedConfig files, so that dev-server can continue running, with its own baked-config data, even while prod-deploy occurs.
// Note: Don't reference the BakedConfig files from anywhere but here (in runtime code) -- because we want to be able to override it, below.
// let {version, dbVersion, firebaseConfig} = DEV ? require("./BakedConfig_Dev") : require("./BakedConfig_Prod");
const {version, firebaseConfig} = DB == "development" ? require("./BakedConfig_Dev") : require("./BakedConfig_Prod");

let dbVersion = 12;
if (startURL.GetQueryVar("dbVersion") && startURL.GetQueryVar("dbVersion") != "null") {
	dbVersion = parseInt(startURL.GetQueryVar("dbVersion"));
	console.log(`Using dbVersion: ${dbVersion}`);
}
export {version, dbVersion, firebaseConfig};
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

// setTimeout(()=>LoadHotModules());
LoadHotModules();