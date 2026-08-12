import {O, Version} from "web-vcore";
import {MtxGroup} from "./database/MtxGroup.js";

export class DatabaseState {
	@O accessor subpage: "requests" | "watchers" | "migrate";
	@O accessor requests = new RequestsState();
	@O accessor watchers = new WatchersState();
}

export class RequestsState {
	@O accessor showRange_duration = 60000;
	@O accessor showRange_end = Date.now();
	@O accessor significantDurationThreshold = 1;

	// groups
	@O.ref @Version(2) accessor groups: MtxGroup[] = [];
}
export class WatchersState {
	//constructor() { makeObservable(this); }
}