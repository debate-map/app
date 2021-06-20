import {globalMapID} from "dm_common";
import {rootPageDefaultChilds} from "Utils/URL/URLs";
import {O} from "web-vcore";
import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {ignore} from "web-vcore/nm/mobx-sync";
import {NotificationMessage} from "./main/@NotificationMessage";
import {DatabaseState} from "./main/database";
import {DebatesPageState} from "./main/debates";
import {MapsState} from "./main/maps";
import {RatingUIState} from "./main/ratingUI";
import {SearchState} from "./main/search";
import {ShareUIState} from "./main/shareUI";
import {SocialPageState} from "./main/social";
import {TimelinesState} from "./main/timelines";

export class MainState {
	// [immerable] = true;

	@O page = "home";
	@O urlExtraStr: string;

	@O lastDBVersion: number; // tracks the last db-version the client started with, so we can know when we need to upgrade the store-data
	@O envOverride: string;
	@O dbOverride: string;
	@O dbVersionOverride: string;

	@O analyticsEnabled = true;
	// topLeftOpenPanel: string;
	// topRightOpenPanel: string;
	@O @ignore notificationMessages = [] as NotificationMessage[];
	@O @ignore shareBeingLoaded: string;

	// pages (and nav-bar panels)
	// ==========

	// stream: {subpage: string};
	// chat: {subpage: string};
	// reputation: {subpage: string};

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

	@O topLeftOpenPanel: string;
	// set topLeftOpenPanel_set(val) { this.topLeftOpenPanel = val; }
	@O topRightOpenPanel: string;
	// set topRightOpenPanel_set(val) { this.topRightOpenPanel = val; }

	// non-page-specific sections/components (corresponds to @Shared folder)
	// ==========

	@O maps = new MapsState();
	@O timelines = new TimelinesState();
	@O shareUI = new ShareUIState();
	@O ratingUI = new RatingUIState();
}

export const GetOpenMapID = StoreAccessor(s=>()=>{
	// return State(a=>a.main.openMap);
	const {page} = s.main;
	// if (page == 'home') return demoMap._id;
	if (page == "debates") return s.main.debates.selectedMapID;
	if (page == "global") return globalMapID;
	return null;
});

// export type PageKey = "home" | ""
export const GetPage = StoreAccessor(s=>()=>{
	return s.main.page || "home";
});
export const GetSubpage = StoreAccessor(s=>()=>{
	const page = GetPage();
	return s.main[page]?.subpage as string || rootPageDefaultChilds[page];
});