import {LogTypes} from "vwebapp-framework";

export class LogTypes_New {
	actions = false;
	nodeRenders = false;
	nodeRenders_for = null as string;
	nodeRenderDetails = false;
	nodeRenderDetails_for = null as string;

	// doesn't actually log; rather, causes data to be stored in component.props.extraInfo.renderTriggers
	renderTriggers = false;
}

export const logTypes = new LogTypes_New() as LogTypes;
G({logTypes}); // expose logTypes globally for console-editing, but don't mention to TS

if (localStorage.getItem("logTypes")) {
	logTypes.Extend(JSON.parse(localStorage.getItem("logTypes")));
}
g.addEventListener("beforeunload", ()=>{
	localStorage.setItem("logTypes", JSON.stringify(logTypes));
});