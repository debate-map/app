import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import {O} from "web-vcore";
import {ignore} from "mobx-sync";
import {store} from "./index.js";
import {DatabaseState} from "./main/database.js";
import {LogsState} from "./main/logs.js";
import {TestingState} from "./main/testing.js";

export type URLParam = {name: string, value: string};
export class MainState {
	@O accessor sideBarExpanded = true;
	@O accessor page = "home";
	@O accessor urlExtraStr: string|n;
	@O @ignore accessor urlOtherFlags: URLParam[] = [];

	@O accessor adminKey = "";

	// pages (and nav-bar panels)
	// ==========

	@O accessor home = {} as {subpage: string};
	@O accessor logs = new LogsState();
	@O accessor db = new DatabaseState();
	@O accessor testing = new TestingState();
	/*@O accessor netdata = {} as {subpage: string};
	@O accessor grafana = {} as {subpage: string};
	@O accessor prometheus = {} as {subpage: string};
	@O accessor pixie = {} as {subpage: string};*/

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