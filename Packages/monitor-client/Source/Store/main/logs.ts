import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";
import {LogGroup} from "./logs/LogGroup";

export class LogsState {
	constructor() { makeObservable(this); }
	/*@O showRange_duration = 60000;
	@O showRange_end = Date.now();
	@O significantDurationThreshold = 1;*/

	// groups
	@O.ref groups: LogGroup[] = [];
}