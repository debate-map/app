import {globalMapID} from "dm_common";
import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink";
import {ignore} from "web-vcore/nm/mobx-sync.js";
import {DatabaseState} from "./main/database.js";
import {DebatesPageState} from "./main/debates.js";
import {MapsState} from "./main/maps.js";
import {MorePageState} from "./main/more.js";
import {ProfileState} from "./main/profile.js";
import {RatingUIState} from "./main/ratingUI.js";
import {SearchState} from "./main/search.js";
import {ShareUIState} from "./main/shareUI.js";
import {SocialPageState} from "./main/social.js";
import {TimelinesState} from "./main/timelines.js";

export type URLParam = {name: string, value: string};
export class MainState {
	constructor() { makeObservable(this); }
	// [immerable] = true;

	@O page = "home";
	@O urlExtraStr: string|n;
	@O @ignore urlOtherFlags: URLParam[] = [];

	@O lastDBVersion: number|n; // tracks the last db-version the client started with, so we can know when we need to upgrade the store-data
	@O envOverride: string|n;
	@O dbOverride: string|n;
	//@O dbVersionOverride: string|n;

	@O analyticsEnabled = true;
	@O blockMobXUnsubscribing = false;
	@O blockCacheClearing = false;
	//topLeftOpenPanel: string;
	//topRightOpenPanel: string;
	@O @ignore shareBeingLoaded: string|n;
	@O @ignore selectNode_fragmentPath: string|n;

	// pages (and nav-bar panels)
	// ==========

	//@O stream = new StreamState();
	//@O chat: {subpage: string};
	//@O reputation: {subpage: string};

	@O database = new DatabaseState();
	@O feedback = {} as {subpage: string};
	// forum: Forum;
	@O more = new MorePageState();
	@O home = {} as {subpage: string};
	@O social = new SocialPageState();
	@O debates = new DebatesPageState();
	@O global = {} as {subpage: string};

	@O search = new SearchState();
	// guide: {subpage: string};
	@O profile = new ProfileState();

	@O topLeftOpenPanel: string|n;
	// set topLeftOpenPanel_set(val) { this.topLeftOpenPanel = val; }
	@O topRightOpenPanel: string|n;
	// set topRightOpenPanel_set(val) { this.topRightOpenPanel = val; }

	// non-page-specific sections/components (roughly corresponds to @Shared folder)
	// ==========

	@O maps = new MapsState();
	@O timelines = new TimelinesState();
	@O shareUI = new ShareUIState();
	@O ratingUI = new RatingUIState();
	//@O lastAccessPolicy: string|n;
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