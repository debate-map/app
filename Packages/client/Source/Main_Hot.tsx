// import React from "react/lib/ReactWithAddons";
import "./Utils/General/ConsoleHelpers";
import ReactDOM from "react-dom";
import {supportReactDevTools} from "react-universal-hooks";
import {JustBeforeInitLibs_listeners, JustBeforeUI_listeners} from "./Main.js";

// supportReactDevTools({ active: DEV });
supportReactDevTools({active: true});

// uncomment this if you want to load the source-maps and such ahead of time (making-so the first actual call can get it synchronously)
// StackTrace.get();

JustBeforeInitLibs_listeners.forEach(a=>a());
require("./Utils/LibIntegrations/@InitLibs").InitLibs();

// start auto-runs after libs are initialized (moved to just after store+firelink are created, in MobXFirelink.ts)
// require('Utils/AutoRuns');

JustBeforeUI_listeners.forEach(a=>a());
const mountNode = document.getElementById("root");
const {RootUIWrapper} = require("./UI/Root");

// wait a moment before rendering; apparently react is more synchronous than before, and can call componentWillMount before all schemas (eg. Map) have had a chance to resolve!
setTimeout(()=>{
	ReactDOM.render(<RootUIWrapper/>, mountNode);
});