import {Log} from "../Serialization/VDF/VDF";
import {ACTNotificationMessageAdd} from "../../Store/main";
import NotificationMessage from "../../Store/main/@NotificationMessage";
import {LogError} from "./Logging";

//g.onerror = function(message: string, filePath: string, line: number, column: number, error: Error) {
g.addEventListener(`error`, e=> {
	let {message, filename: filePath, lineno: line, colno: column, error} = e as {message: string, filename: string, lineno: number, colno: number, error: Error};
	/*LogError(`JS) ${message} (at ${filePath}:${line}:${column})
Stack) ${error.stack}`);*/
	if (error != null)
		HandleError(error);
	else
		HandleError({stack: filePath + ":" + line + ":" + column, toString: ()=>message} as any);
});
g.addEventListener(`unhandledrejection`, e=>{
    //console.error(`Unhandled rejection (promise: `, e.promise, `, reason: `, e.reason, `).`);
	 HandleError(e.reason);
});
g.addEventListener(`onrejectionhandled`, e=>{
    //console.error(`Unhandled rejection (promise: `, e.promise, `, reason: `, e.reason, `).`);
	 HandleError(e.reason);
});

export function HandleError(error: Error, fatal = false) {
	let message = (error.message || error.toString()).replace(/\r/g, "").TrimStart("\n");
	/*let stackWithoutMessage = (
		error.stack && error.message && error.stack.Contains(error.message)
			? error.stack.replace(error.message, "")
			: error.stack || ""
	).TrimStart("\r", "\n");*/
	let stack = (error.stack || "").replace(/\r/g, "").TrimStart("\n");

	//alert("An error occurred: " + error);
	let errorStr = "";
	if (!message.startsWith("Assert failed) "))
		errorStr += `An error has occurred: `;
	if (!stack.Contains(message))
		errorStr += message;
	errorStr += (errorStr.length ? "\n" : "") + stack;
	if (fatal)
		errorStr += "\n[fatal]";
	LogError(errorStr);
	store.dispatch(new ACTNotificationMessageAdd(new NotificationMessage(errorStr)));
}