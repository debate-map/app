import "./Utils/PreRunners/Start_0";
import {VURL} from "web-vcore/nm/js-vextensions";
import ReactDOM from "web-vcore/nm/react-dom";
import {supportReactDevTools} from "web-vcore/nm/react-universal-hooks.js";
import React from "react";

// stuff from Main.ts (in client)
// ==========

const startURL = VURL.Parse(window.location.href);
declare global { export const startURL: VURL; } G({startURL});

// these props get compile-time-replaced (for dead-code-elimination); we never actually add these onto `globalThis`, but we declare them here, so intellisense shows it as option
declare global { var ENV: string; var DEV: boolean; var PROD: boolean; var TEST: boolean; }
// these props do not get compile-time-replaced; these are intentionally able to be modified at runtime (eg. in dev-tools console, or with url flags), eg. to enable/disable certain profiling-data collection
declare global { var ENV_DYN: string; var ENV_DYN_ORIG: string; var DEV_DYN: boolean; var PROD_DYN: boolean; var TEST_DYN: boolean; }

// start by loading the "X_DYN" vars from the compile-time insertions
Object.assign(g, {ENV_DYN: ENV, ENV_DYN_ORIG: ENV, DEV_DYN: DEV, PROD_DYN: PROD, TEST_DYN: TEST});

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