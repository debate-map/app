import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";
import {SubscriptionLevel} from "../../UI/@Shared/Maps/Node/NodeBox/NodeNotificationControl.js";

export class NotificationsState {
	constructor() { makeObservable(this); }

	@O paintMode_notificationLevel = "some" as SubscriptionLevel;
	@O paintMode_painting = false;
}