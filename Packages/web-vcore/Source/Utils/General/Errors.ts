import Raven from "raven-js";
import {manager} from "../../Manager.js";

/** Unlike StringifyError, this doesn't assume that the argument is an actual Error object -- nor does it add a prefix-text or stack-trace. */
export function BasicStringifyErrorlike(errorEvent: ErrorEvent|PromiseRejectionEvent|Event) {
	const e = (errorEvent ?? {}) as any;
	const errorMessage = [
		// for ErrorEvent
		e.message,
		// for PromiseRejectionEvent and Event (from "onrejectionhandled" listener)
		e.reason?.message,
		e.reason,
		// fallbacks
		e?.toString(),
		e,
	].find(a=>a != null);
	const errorStr = `${errorMessage}`;
	return errorStr;
}
export function ShouldErrorBeIgnored(e: ErrorEvent|PromiseRejectionEvent|Event) {
	const errorStr = BasicStringifyErrorlike(e);

	// ignore these "errors"; they occur during normal operation, and are not a problem
	if (errorStr.includes("ResizeObserver loop limit exceeded")) return true;
	if (errorStr.includes("ResizeObserver loop completed with undelivered notifications.")) return true;

	return false;
}

//g.onerror = function(message: string, filePath: string, line: number, column: number, error: Error) {
window.addEventListener("error", e=>{
	if (manager.ShouldErrorBeIgnored(e)) {
		e.stopImmediatePropagation();
		return false;
	}

	const {message, filename: filePath, lineno: line, colno: column, error} = e as {message: string, filename: string, lineno: number, colno: number, error: Error};
	// sentry already picks up errors that make it here; so don't send it to sentry again
	if (error != null) {
		HandleError(error, false);
	} else {
		HandleError({stack: `${filePath}:${line}:${column}`, toString: ()=>message} as any, false);
	}
});
window.addEventListener("unhandledrejection", e=>{
	if (manager.ShouldErrorBeIgnored(e)) {
		e.stopImmediatePropagation();
		return false;
	}

	//console.error(`Unhandled rejection (promise: `, e.promise, `, reason: `, e.reason, `).`);
	HandleError(e["reason"]);
});
window.addEventListener("onrejectionhandled", e=>{
	if (manager.ShouldErrorBeIgnored(e)) {
		e.stopImmediatePropagation();
		return false;
	}

	//console.error(`Unhandled rejection (promise: `, e.promise, `, reason: `, e.reason, `).`);
	HandleError(e["reason"]);
});

export const stringifyError_errorOccurredPrefix = "An error has occurred: ";
export function StringifyError(error: Error, allowAddErrorOccurredPrefix = true) {
	error = error || {message: "[empty error]"} as any;
	const message = (error.message || error.toString()).replace(/\r/g, "").TrimStart("\n");
	const stack = (error.stack || "").replace(/\r/g, "").TrimStart("\n");
	//const stackWithoutMessage = stack && message && stack.startsWith(message) ? error.stack.slice(message.length) : stack;

	let errorStr = "";
	if (allowAddErrorOccurredPrefix) {
		const alreadyHasPrefix = message.startsWith("Assert failed) ");
		if (!alreadyHasPrefix) errorStr += stringifyError_errorOccurredPrefix;
	}
	if (!stack.includes(message)) errorStr += message;
	errorStr += (errorStr.length ? "\n" : "") + stack;
	return errorStr;
}
export function HandleError(error: Error, recordWithSentry = true, extraInfo = {}) {
	const errorStr = StringifyError(error);
	//alert("An error has occurred: " + error);

	if (recordWithSentry) {
		// errors that should be shown to user, but not recorded
		//if (errorStr.startsWith("KaTeX parse error: ")) return;

		SendErrorToSentry(error, extraInfo);
	}

	if (manager.PostHandleError) manager.PostHandleError(error, errorStr);
}
export function SendErrorToSentry(error: Error, extraInfo = {}) {
	Raven.captureException(error, {extra: extraInfo});
}