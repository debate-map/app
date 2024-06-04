import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";

export enum NotificationLevel {
	none = "none",
	partial = "partial",
	all = "all"
}

export class NotificationsState {
	constructor() { makeObservable(this); }

	@O paintMode_notificationLevel = NotificationLevel.partial;
}