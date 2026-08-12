import {O} from "web-vcore";

export enum ProfilePanel {
	general = "general",
	appearance = "appearance",
	notifications = "notifications",
}
export class ProfileState {
	@O accessor panel = ProfilePanel.general;
}