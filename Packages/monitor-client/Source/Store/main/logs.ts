import {O} from "web-vcore";
import {makeObservable} from "mobx";
import {LogGroup} from "./logs/LogGroup.js";

export enum LogsPanel {
	stored = "stored",
	realtime = "realtime",
}

export class LogsState {
	constructor() { makeObservable(this); }

	@O panel = LogsPanel.stored;

	// shared
	@O.ref groups: LogGroup[] = [];

	// stored
	@O showRange_start = Date.now() - (1 * 60 * 60 * 1000);
	@O showRange_end = Date.now();
	@O showRange_end_enabled = false;
	@O limit = 1000;
	@O query = `{app="dm-app-server"}`;

	// realtime
}