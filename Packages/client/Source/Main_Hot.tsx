// import React from "react/lib/ReactWithAddons";
import "./Utils/General/ConsoleHelpers";
import {createRoot} from "react-dom/client";
import {JustBeforeInitLibs_listeners, JustBeforeUI_listeners} from "./Main.js";

// uncomment this if you want to load the source-maps and such ahead of time (making-so the first actual call can get it synchronously)
// StackTrace.get();

JustBeforeInitLibs_listeners.forEach(a=>a());
require("./Utils/LibIntegrations/@InitLibs").InitLibs();

// start auto-runs after libs are initialized (moved to just after store+firelink are created, in MobXFirelink.ts)
// require('Utils/AutoRuns');

JustBeforeUI_listeners.forEach(a=>a());
const mountNode = document.getElementById("root") as HTMLDivElement;
//const {RootUIWrapper} = require("./UI/Root.js");
const {RootUIWrapper} = require("./UI/Root");

// wait a moment before rendering; apparently react is more synchronous than before, and can call componentWillMount before all schemas (eg. Map) have had a chance to resolve!
setTimeout(()=>{
	const root = createRoot(mountNode);
	root.render(<RootUIWrapper/>);
});