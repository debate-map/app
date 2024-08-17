import {SubscriptionLevel} from "dm_common";
import {O} from "web-vcore";
import {makeObservable} from "mobx";

export class NotificationsState {
	constructor() { makeObservable(this); }

	@O paintMode_notificationLevel = "some" as SubscriptionLevel;
	@O paintMode_painting = false;
}