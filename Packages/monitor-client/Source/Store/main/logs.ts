import {O} from "web-vcore";
import {LogGroup} from "./logs/LogGroup.js";

export enum LogsPanel {
	stored = "stored",
	realtime = "realtime",
}

export class LogsState {
	@O accessor panel = LogsPanel.stored;

	// shared
	@O.ref accessor groups: LogGroup[] = [];

	// stored
	@O accessor showRange_start = Date.now() - (1 * 60 * 60 * 1000);
	@O accessor showRange_end = Date.now();
	@O accessor showRange_end_enabled = false;
	@O accessor limit = 1000;
	@O accessor query = `{app="dm-app-server"}`;

	// realtime
}