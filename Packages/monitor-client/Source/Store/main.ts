import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";
import {ignore} from "web-vcore/nm/mobx-sync.js";
import {store} from "./index.js";
import {DatabaseState} from "./main/database.js";
import {LogsState} from "./main/logs.js";
import {TestingState} from "./main/testing.js";

export type URLParam = {name: string, value: string};
export class MainState {
	constructor() { makeObservable(this); }

	@O sideBarExpanded = true;
	@O page = "home";
	@O urlExtraStr: string|n;
	@O @ignore urlOtherFlags: URLParam[] = [];

	@O adminKey = "";

	// pages (and nav-bar panels)
	// ==========

	@O home = {} as {subpage: string};
	@O logs = new LogsState();
	@O db = new DatabaseState();
	@O testing = new TestingState();
	/*@O netdata = {} as {subpage: string};
	@O grafana = {} as {subpage: string};
	@O prometheus = {} as {subpage: string};
	@O pixie = {} as {subpage: string};*/

	// non-page-specific sections/components (roughly corresponds to @Shared folder)
	// ==========
}

export const GetPage = /*CreateAccessor*/(function() {
	//return this!.store.main.page || "home";
	return store.main.page || "home";
});
export const GetSubpage = /*CreateAccessor*/(function() {
	const page = GetPage();
	//return this!.store.main[page]?.subpage as string || rootPageDefaultChilds[page];
	return store.main[page]?.subpage as string || rootPageDefaultChilds[page];
});