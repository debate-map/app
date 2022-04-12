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
	@O significantDurationThreshold = 1;

	// groups
	@O group1_path_matchEnabled = false;
	@O group1_path_matchStr = "";
	@O group1_extraInfo_matchEnabled = false;
	@O group1_extraInfo_matchStr = "";
	@O group1_filter = false;
	@O group1_highlight = false;
}