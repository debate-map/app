//import V from "../V/V";
import {GetStackTraceStr} from "../V/V";
import {Global} from "./Globals_Free";
/*var Debug = true;

var Log = function(msg, type = 'default') { if(!Debug) return;
 var colorString = '';
 switch(type) { case 'error': colorString = '\x1b[91m';
 break;
 case 'warning': colorString = '\x1b[93m';
 break;
 case 'default': default: colorString = '\x1b[0m';
 break;
 } var spaceString = Array(7 - process.pid.toString().length).join(' ');
 console.log(colorString, process.pid + '' + spaceString + msg + '\x1b[0m');
};*/

/*console.log_orig = console.log;
console.log = function(message) {
    var str = message + "";
    if (str.Contains("blacklist pattern [")) return; // disable smooth-scroller extension's message
    console.log_orig.apply(this, arguments);
};*/

var warn_orig = console.warn;
console.warn = function(...args) {
	//var str = message + "";
	if (args[2] && args[2].Contains("do not mix longhand and shorthand properties in the same style object")) return;
	if (args[0] && args[0].Contains("a promise was created in a handler but was not returned from it, see http://goo.gl/rRqMUw")) return;
	warn_orig.apply(this, args);
};

var error_orig = console.error;
console.error = function(exception) {
    var str = exception + "";
    if (str.Contains('Warning: A component is `contentEditable`')) return;
    //if (str.Contains("Warning: Unknown prop `")) return;
    error_orig.apply(this, arguments);

    //LogSourceStackTraceFrom(new Error());
};

// fix for that console.table doesn't seem to be working (as used by react-addons-perf)
//console.table = function() { console.log.apply(this, arguments); };

@Global
export class LogTypes {
	nodeRenders = false;
	nodeRenders_for = null as number;
	pageViews = false;
	urlLoads = false;
	cacheUpdates = false;
	commands = false;
}

declare global { var logTypes: LogTypes; }
g.logTypes = new LogTypes();

if (localStorage.getItem("logTypes")) {
	g.logTypes = JSON.parse(localStorage.getItem("logTypes"));
}
g.addEventListener("beforeunload", ()=> {
	localStorage.setItem("logTypes", JSON.stringify(logTypes));
});

g.Extend({ShouldLog}); declare global { function ShouldLog(logTypeGetter: (logTypes: LogTypes)=>boolean); }
function ShouldLog(logTypeGetter: (logTypes: LogTypes)=>boolean) {
	return logTypeGetter(g.logTypes || {});
}
g.Extend({MaybeLog}); declare global { function MaybeLog(logTypeGetter: (logTypes: LogTypes)=>boolean, logMessageGetter: ()=>string); }
function MaybeLog(logTypeGetter: (logTypes: LogTypes)=>boolean, logMessageGetter: ()=>string) {
	if (!ShouldLog(logTypeGetter)) return;
	Log(logMessageGetter());
}

export var onLogFuncs = [];
//declare global { function Log(...args); } g.Extend({Log});
g.Extend({Log}); declare global { function Log(message, appendStackTrace?: boolean, logLater?: boolean); }
export function Log(message, appendStackTrace = false, logLater = false) {
	// #mms: add-stack-trace-and-current-call-info-to-logs setting exists

	var finalMessage = message;
	if (appendStackTrace) {
		/*if (inUnity)
			finalMessage += "\n\nStackTrace) " + new Error().Stack;
		else*/
		finalMessage += "\n@" + GetStackTraceStr();
	}

	console.log(finalMessage);

	for (let onLogFunc of onLogFuncs)
		onLogFunc(message, appendStackTrace, logLater);

	return message;
}

declare global { function LogLater(message, appendStackTrace?); } g.Extend({LogLater});
export function LogLater(message, appendStackTrace = false) {
    Log(message, appendStackTrace, true);
}
declare global { function LogWarning(message, appendStackTrace?, logLater?); } g.Extend({LogWarning});
export function LogWarning(message, appendStackTrace = false, logLater = false) {
	console.warn("LogWarning) " + message);
	return message;
}

declare global { function LogError(message, appendStackTrace?, logLater?); } g.Extend({LogError});
export function LogError(message, appendStackTrace = false, logLater = false) {
	console.error("LogError) " + message);
	return message;
}