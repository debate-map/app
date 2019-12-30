import {immerable} from "immer";
import {Global} from "js-vextensions";
import {observable} from "mobx";
import {ignore} from "mobx-sync";
import {O, StoreAction} from "vwebapp-framework";
import {rootPageDefaultChilds} from "Utils/URL/URLs";
import {StoreAccessor} from "mobx-firelink";
import {store} from "Store";
import {GetNodeL3} from "./firebase/nodes/$node";
import {globalMapID} from "./firebase/nodes/@MapNode";
import {DatabaseState} from "./main/database";
import {PublicPageState} from "./main/public";
import {MapState} from "./main/maps/mapStates/@MapState";
import {MapView, GetMapView} from "./main/maps/mapViews/$mapView";
import {PrivatePageState} from "./main/private";
import {RatingUIState} from "./main/ratingUI";
import {SearchState} from "./main/search";
import {MapsState} from "./main/maps";
import {TimelinesState} from "./main/timelines";

export enum WeightingType {
	Votes = 10,
	ReasonScore = 20,
}

@Global
export class NotificationMessage {
	static lastID = -1;

	constructor(text: string) {
		this.id = ++NotificationMessage.lastID;
		this.text = text;
	}

	id: number;
	text: string;
}

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
	@O @ignore notificationMessages: NotificationMessage[];

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
	// @SocialStateM social: SocialState;
	@O private = new PrivatePageState();
	@O public = new PublicPageState();
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
	@O ratingUI = new RatingUIState();
}

export const GetOpenMapID = StoreAccessor(s=>()=>{
	// return State(a=>a.main.openMap);
	const {page} = s.main;
	// if (page == 'home') return demoMap._id;
	if (page == "private") return s.main.private.selectedMapID;
	if (page == "public") return s.main.public.selectedMapID;
	if (page == "global") return globalMapID;
	return null;
});

// export type PageKey = "home" | ""
export const GetPage = StoreAccessor(s=>()=>{
	return s.main.page || "home";
});
export const GetSubpage = StoreAccessor(s=>()=>{
	const page = GetPage();
	return s.main[page].subpage as string || rootPageDefaultChilds[page];
});