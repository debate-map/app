import {makeObservable} from "mobx";
import {ignore} from "mobx-sync";
import {NotificationMessage} from "../UI/NotificationsUI/NotificationMessage.js";
import {O} from "../Utils/Store/MobX.js";
import {ErrorMessage} from "../UI/NotificationsUI/ErrorMessage.js";

export class WVCState {
	constructor() { makeObservable(this); }

	@O @ignore errorMessages = [] as ErrorMessage[];
	@O @ignore notificationMessages = [] as NotificationMessage[];
	@O @ignore webSocketConnected = false;
	//@O @ignore webSocketError = false;
	@O @ignore webSocketLastDCTime: number;
}

export const wvc_store = new WVCState();