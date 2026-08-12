import {SubscriptionLevel} from "dm_common";
import {O} from "web-vcore";

export class NotificationsState {
	@O accessor paintMode_notificationLevel = "some" as SubscriptionLevel;
	@O accessor paintMode_painting = false;
}