import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {ignore} from "web-vcore/nm/mobx-sync.js";
import {store} from "./index.js";
import {NotificationMessage} from "./main/@NotificationMessage.js";

export type URLParam = {name: string, value: string};
export class MainState {
	constructor() { makeObservable(this); }

	@O page = "home";
	@O urlExtraStr: string|n;
	@O @ignore urlOtherFlags: URLParam[] = [];

	@O @ignore notificationMessages = [] as NotificationMessage[];
	@O @ignore webSocketConnected = false;
	@O @ignore webSocketLastDCTime: number;

	// pages (and nav-bar panels)
	// ==========

	@O home = {} as {subpage: string};
	@O db = {} as {subpage: string};

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