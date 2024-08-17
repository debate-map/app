import {version} from "mobx-sync";
import {O} from "web-vcore";
import {makeObservable} from "mobx";
import {MtxGroup} from "./database/MtxGroup.js";

export class DatabaseState {
	constructor() { makeObservable(this); }
	@O subpage: "requests" | "watchers" | "migrate";
	@O requests = new RequestsState();
	@O watchers = new WatchersState();
}

export class RequestsState {
	constructor() { makeObservable(this); }
	@O showRange_duration = 60000;
	@O showRange_end = Date.now();
	@O significantDurationThreshold = 1;

	// groups
	@O.ref @version(2) groups: MtxGroup[] = [];
}
export class WatchersState {
	//constructor() { makeObservable(this); }
}