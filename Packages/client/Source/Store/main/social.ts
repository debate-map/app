import {O} from "web-vcore";
import {makeObservable} from "mobx";

export class SocialPageState {
	constructor() { makeObservable(this); }
	@O subpage: "stream";
	@O showAll = false;
}