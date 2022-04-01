import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";

export class DatabaseState {
	constructor() { makeObservable(this); }
	@O subpage: "requests" | "migrate";
	@O requests = new RequestsState();
}

export class RequestsState {
	constructor() { makeObservable(this); }
	@O showRange_duration = 60000;
	@O showRange_end = Date.now();
}