import {ignore} from "mobx-sync";
import {NotificationMessage} from "../UI/NotificationsUI/NotificationMessage.js";
import {O} from "../Utils/Store/MobX.js";

export class WVCState {
	@O @ignore accessor notificationMessages = [] as NotificationMessage[];
	@O @ignore accessor webSocketConnected = false;
	//@O @ignore accessor webSocketError = false;
	@O @ignore accessor webSocketLastDCTime: number;
}

export const wvc_store = new WVCState();