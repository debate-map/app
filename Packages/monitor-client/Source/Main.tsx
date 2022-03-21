import "./Utils/PreRunners/Start_0";
import {VURL} from "web-vcore/nm/js-vextensions";
import ReactDOM from "web-vcore/nm/react-dom";
import {supportReactDevTools} from "web-vcore/nm/react-universal-hooks.js";
import React from "react";

// stuff from Main.ts (in client)
// ==========

const startURL = VURL.Parse(window.location.href);
declare global { export const startURL: VURL; } G({startURL});

// always compile-time
declare global { var ENV_COMPILE_TIME: string; }
// only compile-time if compiled for production (otherwise, can be overriden)
declare global { var ENV: string; var DEV: boolean; var PROD: boolean; var TEST: boolean; }

// if environment at compile time was not "production" (ie. if these globals weren't set/locked), then set them here at runtime
if (ENV_COMPILE_TIME != "production") {
	g.ENV = ENV_COMPILE_TIME;
	/*const envStr = AsNotNull(startURL.GetQueryVar("env"));
	if (envStr) {
		g.ENV = {dev: "development", prod: "production"}[envStr] || envStr;
		// alert("Using env: " + g.ENV);
		console.log(`Using env: ${ENV}`);
	}*/

	g.DEV = ENV == "development";
	g.PROD = ENV == "production";
	g.TEST = ENV == "test";
} else {
	// else, turn the compile-time replacements into true globals
	// NOTE: Do NOT "simplify" these to just {X, Y, Z}, else it breaks the compile-time replacement.
	Object.assign(g, { ENV: ENV, DEV: DEV, PROD: PROD, TEST: TEST }); // eslint-disable-line
}

// rest
// ==========

// supportReactDevTools({ active: DEV });
supportReactDevTools({active: true});

require("./Utils/LibIntegrations/@InitLibs").InitLibs();

const mountNode = document.getElementById("root");
const {RootUIWrapper} = require("./UI/Root");

// wait a moment before rendering; apparently react is more synchronous than before, and can call componentWillMount before all schemas (eg. Map) have had a chance to resolve!
setTimeout(()=>{
	ReactDOM.render(<RootUIWrapper/>, mountNode);
});