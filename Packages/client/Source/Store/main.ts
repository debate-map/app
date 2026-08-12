import {globalMapID} from "dm_common";
import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import {Ignore, O} from "web-vcore";
import {CreateAccessor} from "mobx-graphlink";
import {DatabaseState} from "./main/database.js";
import {DebatesPageState} from "./main/debates.js";
import {GuideState} from "./main/guide.js";
import {MapsState} from "./main/maps.js";
import {MorePageState} from "./main/more.js";
import {ProfileState} from "./main/profile.js";
import {RatingUIState} from "./main/ratingUI.js";
import {SearchState} from "./main/search.js";
import {ShareUIState} from "./main/shareUI.js";
import {SocialPageState} from "./main/social.js";
import {TimelinesState} from "./main/timelines.js";
import {NotificationsState} from "./main/notifications.js";

export type URLParam = {name: string, value: string};
export class MainState {
	// [immerable] = true;

	@O accessor page = "home";
	@O accessor urlExtraStr: string|n;
	@O  @Ignore accessor urlOtherFlags: URLParam[] = [];

	@O accessor lastDBVersion: number|n; // tracks the last db-version the client started with, so we can know when we need to upgrade the store-data
	@O accessor envOverride: string|n;
	@O accessor dbOverride: string|n;
	//@O accessor dbVersionOverride: string|n;

	@O accessor analyticsEnabled = true;
	@O accessor blockMobXUnsubscribing = false;
	@O accessor blockCacheClearing = false;
	@O  @Ignore accessor shareBeingLoaded: string|n;
	@O  @Ignore accessor selectNode_fragmentPath: string|n;

	// pages (and nav-bar panels)
	// ==========

	//@O accessor stream = new StreamState();
	@O accessor notifications = new NotificationsState();
	//@O accessor chat: {subpage: string};
	//@O accessor reputation: {subpage: string};

	@O accessor database = new DatabaseState();
	@O accessor feedback = {} as {subpage: string};
	// forum: Forum;
	@O accessor more = new MorePageState();
	@O accessor home = {} as {subpage: string};
	@O accessor social = new SocialPageState();
	@O accessor debates = new DebatesPageState();
	@O accessor global = {} as {subpage: string};

	@O accessor search = new SearchState();
	@O accessor guide = new GuideState();
	@O accessor profile = new ProfileState();

	@O accessor topLeftOpenPanel: string|n;
	// set topLeftOpenPanel_set(val) { this.topLeftOpenPanel = val; }
	@O accessor topRightOpenPanel: string|n;
	// set topRightOpenPanel_set(val) { this.topRightOpenPanel = val; }

	// non-page-specific sections/components (roughly corresponds to @Shared folder)
	// ==========

	@O accessor maps = new MapsState();
	@O accessor timelines = new TimelinesState();
	@O accessor shareUI = new ShareUIState();
	@O accessor ratingUI = new RatingUIState();
	//@O accessor lastAccessPolicy: string|n;
}

export const GetOpenMapID = CreateAccessor({ctx: 1}, function() {
	// return State(a=>a.main.openMap);
	const {page} = this.store.main;
	// if (page == 'home') return demoMap._id;
	if (page == "debates") return this.store.main.debates.selectedMapID;
	if (page == "global") return globalMapID;
	return null;
});

// export type PageKey = "home" | ""
export const GetPage = CreateAccessor({ctx: 1}, function() {
	return this.store.main.page || "home";
});
export const GetSubpage = CreateAccessor({ctx: 1}, function() {
	const page = GetPage();
	return this.store.main[page]?.subpage as string || rootPageDefaultChilds[page];
});