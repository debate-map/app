import {O} from "web-vcore";
import {makeObservable} from "mobx";

export enum ProfilePanel {
	general = "general",
	appearance = "appearance",
	notifications = "notifications",
}
export class ProfileState {
	constructor() { makeObservable(this); }

	@O panel = ProfilePanel.general;
}