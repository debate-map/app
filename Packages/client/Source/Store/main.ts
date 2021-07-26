import {globalMapID} from "dm_common";
import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {ignore} from "web-vcore/nm/mobx-sync.js";
import {NotificationMessage} from "./main/@NotificationMessage.js";
import {DatabaseState} from "./main/database.js";
import {DebatesPageState} from "./main/debates.js";
import {MapsState} from "./main/maps.js";
import {RatingUIState} from "./main/ratingUI.js";
import {SearchState} from "./main/search.js";
import {ShareUIState} from "./main/shareUI.js";
import {SocialPageState} from "./main/social.js";
import {TimelinesState} from "./main/timelines.js";

export class MainState {
	constructor() { makeObservable(this); }
	// [immerable] = true;

	@O page = "home";
	@O urlExtraStr: string|n;

	@O lastDBVersion: number|n; // tracks the last db-version the client started with, so we can know when we need to upgrade the store-data
	@O envOverride: string|n;
	@O dbOverride: string|n;
	@O dbVersionOverride: string|n;

	@O analyticsEnabled = true;
	// topLeftOpenPanel: string;
	// topRightOpenPanel: string;
	@O @ignore notificationMessages = [] as NotificationMessage[];
	@O @ignore shareBeingLoaded: string|n;

	/*@O @ignore userID_apollo: string|n; // maybe rework
	@O @ignore userID_apollo_ready = false; // maybe rework*/

	// pages (and nav-bar panels)
	// ==========

	//@O stream = new StreamState();
	//@O chat: {subpage: string};
	//@O reputation: {subpage: string};

	@O database = new DatabaseState();
	@O feedback = {} as {subpage: string};
	// forum: Forum;
	@O more = {} as {subpage: string};
	@O home = {} as {subpage: string};
	@O social = new SocialPageState();
	@O debates = new DebatesPageState();
	@O global = {} as {subpage: string};

	@O search = new SearchState();
	// guide: {subpage: string};
	@O profile = {} as {subpage: string};

	@O topLeftOpenPanel: string|n;
	// set topLeftOpenPanel_set(val) { this.topLeftOpenPanel = val; }
	@O topRightOpenPanel: string|n;
	// set topRightOpenPanel_set(val) { this.topRightOpenPanel = val; }

	// non-page-specific sections/components (corresponds to @Shared folder)
	// ==========

	@O maps = new MapsState();
	@O timelines = new TimelinesState();
	@O shareUI = new ShareUIState();
	@O ratingUI = new RatingUIState();
}

export const GetOpenMapID = CreateAccessor(function() {
	// return State(a=>a.main.openMap);
	const {page} = this!.store.main;
	// if (page == 'home') return demoMap._id;
	if (page == "debates") return this!.store.main.debates.selectedMapID;
	if (page == "global") return globalMapID;
	return null;
});

// export type PageKey = "home" | ""
export const GetPage = CreateAccessor(function() {
	return this!.store.main.page || "home";
});
export const GetSubpage = CreateAccessor(function() {
	const page = GetPage();
	return this!.store.main[page]?.subpage as string || rootPageDefaultChilds[page];
});