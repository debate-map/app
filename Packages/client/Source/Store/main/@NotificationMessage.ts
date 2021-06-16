import {Global} from "web-vcore/nm/js-vextensions";
import {runInAction} from "web-vcore/nm/mobx";
import {store} from "..";

@Global
export class NotificationMessage {
	static lastID = -1;

	constructor(text: string) {
		this.id = ++NotificationMessage.lastID;
		this.text = text;
	}

	id: number;
	text: string;
}

// helper (main use: for use from Start_0.ts)
export function AddNotificationMessage(message: string) {
	runInAction("VWAF.PostHandleError", ()=>{
		try {
			store.main.notificationMessages.push(new NotificationMessage(message));
		} catch (ex) {
			g.alertCount_notifications = (g.alertCount_notifications | 0) + 1;
			if (g.alertCount_notifications <= 2) {
				alert(message);
			} else {
				console.error(message);
			}
		}
	});
}
G({AddNotificationMessage});