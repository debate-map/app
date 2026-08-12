import {NotificationMessage} from "../UI/NotificationsUI/NotificationMessage.js";
import {Ignore, O} from "../Utils/Store/MobX.js";

export class WVCState {
	@O  @Ignore accessor notificationMessages = [] as NotificationMessage[];
	@O  @Ignore accessor webSocketConnected = false;
	//@O  @Ignore accessor webSocketError = false;
	@O  @Ignore accessor webSocketLastDCTime: number;
}

export const wvc_store = new WVCState();