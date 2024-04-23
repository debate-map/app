import {GetStackTraceStr, E} from "js-vextensions";
import {LogTypes} from "web-vcore_UserTypes";

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
	if (typeof args[2] == "string" && args[2].includes("do not mix longhand and shorthand properties in the same style object")) return;
	if (typeof args[0] == "string" && args[0].includes("a promise was created in a handler but was not returned from it, see http://goo.gl/rRqMUw")) return;
	return warn_orig.apply(this, args);
};

var error_orig = console.error;
console.error = function(exception) {
	var str = `${exception}`;
	if (str.Contains("Warning: A component is `contentEditable`")) return;
	//if (str.Contains("Warning: Unknown prop `")) return;
	return error_orig.apply(this, arguments);

	//LogSourceStackTraceFrom(new Error());
};

// fix for that console.table doesn't seem to be working (as used by react-addons-perf)
//console.table = function() { console.log.apply(this, arguments); };

// export type LogFunc = LogFunc_Full | LogFunc_Min;
export type LogFunc_Full = (options: LogOptions, ...messageSegments: any[])=>any;
export type LogFunc_Min = (...messageSegments: any[])=>any;
export var onLogFuncs = [] as LogFunc_Full[];

export interface LogOptions {
	type?: "log" | "warn" | "error";
	appendStackTrace?: boolean;
	logLater?: boolean;
}
export function Log(options: LogOptions, ...messageSegments: any[]);
export function Log(...messageSegments: any[]);
export function Log(...args) {
	let options: LogOptions = {};
	let messageSegments: any[];
	if (typeof args[0] === "object") [options, ...messageSegments] = args;
	else messageSegments = args;
	// #mms: add-stack-trace-and-current-call-info-to-logs setting exists

	if (options.appendStackTrace) {
		/* if (inUnity)
			finalMessage += "\n\nStackTrace) " + new Error().stack;
		else */
		messageSegments.push(`\n@${GetStackTraceStr()}`);
	}

	const logType = options.type || "log";
	console[logType](...messageSegments);

	for (const onLogFunc of onLogFuncs) {
		onLogFunc(options, messageSegments);
	}

	return messageSegments.length == 1 ? messageSegments[0] : messageSegments;
}

/*export function LogLater(options: LogOptions, ...messageSegments: any[]);
export function LogLater(...messageSegments: any[]);
export function LogLater(...args) {
	if (typeof args[0] == "object") return Log(E({logLater: true}, args[0]), ...args.slice(1));
	return Log({logLater: true}, ...args);
}*/
export function LogWarning(options: LogOptions, ...messageSegments: any[]);
export function LogWarning(...messageSegments: any[]);
export function LogWarning(...args) {
	if (typeof args[0] == "object") return Log(E({type: "warn"}, args[0]), ...args.slice(1));
	return Log({type: "warn"}, ...args);
}
export function LogError(options: LogOptions, ...messageSegments: any[]);
export function LogError(...messageSegments: any[]);
export function LogError(...args) {
	if (typeof args[0] == "object") return Log(E({type: "error"}, args[0]), ...args.slice(1));
	return Log({type: "error"}, ...args);
}

export function ShouldLog(shouldLogFunc: (logTypes: LogTypes)=>boolean) {
	return shouldLogFunc(window["logTypes"] || {});
}
export function MaybeLog(shouldLogFunc: (logTypes: LogTypes)=>boolean, loggerFunc: any) {
	if (!ShouldLog(shouldLogFunc)) return;
	// let loggerFuncReturnsString = loggerFunc.arguments.length == 0;
	const loggerFuncIsSimpleGetter = loggerFunc.toString().replace(/ /g, "").includes("function()");
	if (loggerFuncIsSimpleGetter) Log(loggerFunc());
	else loggerFunc(Log);
}