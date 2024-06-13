import {SubscriptionLevel} from "dm_common";
import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";

export class NotificationsState {
	constructor() { makeObservable(this); }

	@O paintMode_notificationLevel = "some" as SubscriptionLevel;
	@O paintMode_painting = false;
}