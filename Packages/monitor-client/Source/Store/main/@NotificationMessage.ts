import {RunInAction} from "web-vcore";
import {Global} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {store} from "..";

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

// helper (main use: for use from Start_0.ts)
export function AddNotificationMessage(message: string, pinnedFor?: number) {
	RunInAction("WVC.PostHandleError", ()=>{
		try {
			store.main.notificationMessages.push(new NotificationMessage(message, pinnedFor));
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