import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";

export enum ProfilePanel {
	general = "general",
	appearance = "appearance",
	notifications = "notifications",
}
export class ProfileState {
	constructor() { makeObservable(this); }

	@O panel = ProfilePanel.general;
}