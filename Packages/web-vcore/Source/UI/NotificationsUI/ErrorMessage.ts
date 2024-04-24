import {Global} from "js-vextensions";
import {RunInAction} from "mobx-graphlink";
import {manager} from "../../Manager.js";
import {g} from "../../PrivateExports.js";
import {wvc_store} from "../../Store/WVCStore.js";
import {NotificationMessage} from "./NotificationMessage.js";

@Global
export class ErrorMessage extends NotificationMessage {

	constructor(text: string, stackTrace: string, pinnedFor?: number) {
        super(text, pinnedFor);

        this.stackTrace = stackTrace;
	}

    stackTrace: string;
}

/** Helper, which tries to add a notification-message to the store, but if that fails, falls back to an alert. (useful, eg. in Start_0.ts) */
export function AddErrorMessage(message: string, stackTrace: string, pinnedFor?: number) {
	RunInAction("WVC.PostHandleError", ()=>{
		try {
			wvc_store.notificationMessages.push(new ErrorMessage(message, stackTrace, pinnedFor));
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