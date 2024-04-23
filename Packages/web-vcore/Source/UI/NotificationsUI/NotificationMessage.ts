import {Global} from "js-vextensions";
import {RunInAction} from "mobx-graphlink";
import {manager} from "../../Manager.js";
import {g} from "../../PrivateExports.js";
import {wvc_store} from "../../Store/WVCStore.js";

@Global
export class NotificationMessage {
	static lastID = -1;

	constructor(text: string, pinnedFor?: number) {
		this.id = ++NotificationMessage.lastID;
		this.text = text;
		if (pinnedFor) {
			this.pinnedTill = Date.now() + pinnedFor;
		}
	}

	id: number;
	text: string;
	pinnedTill?: number; // used, eg. for testing pinned-message UI
}

/** Helper, which tries to add a notification-message to the store, but if that fails, falls back to an alert. (useful, eg. in Start_0.ts) */
export function AddNotificationMessage(message: string, pinnedFor?: number) {
	RunInAction("WVC.PostHandleError", ()=>{
		try {
			wvc_store.notificationMessages.push(new NotificationMessage(message, pinnedFor));
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
G({AddNotificationMessage});