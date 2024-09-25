import {GetStackTraceStr, Global} from "js-vextensions";
import {RunInAction} from "mobx-graphlink";
import {manager} from "../../Manager.js";
import {g} from "../../PrivateExports.js";
import {wvc_store} from "../../Store/WVCStore.js";
import {NotificationMessage} from "./NotificationMessage.js";
import {SendErrorToSentry} from "../../Utils/General/Errors.js";

@Global
export class ErrorMessage extends NotificationMessage {
	constructor(text: string, stackTrace: string, pinnedFor?: number) {
		super(text, pinnedFor);

		this.stackTrace = stackTrace;
	}

	stackTrace: string;
}

/** Helper, which tries to add a notification-message to the store, but if that fails, falls back to an alert. (useful, eg. in Start_0.ts) */
export function AddErrorMessage(message: string, stackTrace: string|n, pinnedFor?: number) {
	if (stackTrace == null) stackTrace = GetStackTraceStr();
	RunInAction("WVC.PostHandleError", ()=>{
		try {
			wvc_store.notificationMessages.push(new ErrorMessage(message, stackTrace!, pinnedFor));
		} catch (ex) {
			g.alertCount_notifications = (g.alertCount_notifications ?? 0) + 1;
			if (g.alertCount_notifications <= 2) {
				alert(message);
			} else {
				console.error(message);
			}
		}
	});
}
G({AddErrorMessage});

// for things which shouldn't happen (with notification and sentry-capture if it does), but should not cause error/crash
export function AssertNotify(condition, messageOrMessageFunc?: string | Function) {
	if (condition) return;

	var message = messageOrMessageFunc instanceof Function ? messageOrMessageFunc() : messageOrMessageFunc;
	//const finalMessage = `Assert failed) ${message}\n\nStackTrace) ${GetStackTraceStr()}`;
	const finalMessage = `Assert[notify] failed: ${message}`;
	console.warn(finalMessage);
	AddErrorMessage(finalMessage, GetStackTraceStr());
	SendErrorToSentry(new Error(finalMessage), {}, {stacktrace: true});
	//Sentry.captureMessage(finalMessage, "warning");
}