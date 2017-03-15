import V from "../V/V";
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
    if (str.contains("blacklist pattern [")) return; // disable smooth-scroller extension's message
    console.log_orig.apply(this, arguments);
};*/

var warn_orig = console.warn;
console.warn = function(message) {
    //var str = message + "";
    if (arguments[2] && arguments[2].contains("do not mix longhand and shorthand properties in the same style object")) return;
    warn_orig.apply(this, arguments);
};

var error_orig = console.error;
console.error = function(exception) {
    var str = exception + "";
    if (str.contains('Warning: A component is `contentEditable`')) return;
    //if (str.Contains("Warning: Unknown prop `")) return;
    error_orig.apply(this, arguments);

    //LogSourceStackTraceFrom(new Error());
};

export var onLogFuncs = [];
export function Log(message, appendStackTrace = false, logLater = false) {
	// #mms: add-stack-trace-and-current-call-info-to-logs setting exists

	var finalMessage = message;
	if (appendStackTrace) {
		/*if (inUnity)
			finalMessage += "\n\nStackTrace) " + new Error().Stack;
		else*/
		finalMessage += "\n@" + V.GetStackTraceStr();
	}

	console.log(finalMessage);

	for (let onLogFunc of onLogFuncs)
		onLogFunc(message, appendStackTrace, logLater);

	return message;
}
g.Extend({Log});

export function LogLater(message, appendStackTrace = false) {
    Log(message, appendStackTrace, true);
}
g.Extend({LogLater});
export function LogWarning(message, appendStackTrace = false, logLater = false) {
	console.warn("LogWarning) " + message);
	return message;
}
g.Extend({LogWarning});

export function LogError(message, appendStackTrace = false, logLater = false) {
	console.error("LogError) " + message);
	return message;
}
g.Extend({LogError});