import {GetMap, GetShare, globalMapID, ShareType} from "dm_common";
import {Assert} from "js-vextensions";
import {autorun, runInAction} from "mobx";
import {GetAsync} from "mobx-graphlink";
import {store} from "Store";
import {ACTMapViewMerge} from "Store/main/maps/mapViews/$mapView.js";
import {currentMapUI, MapUI} from "UI/@Shared/Maps/MapUI.js";
import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import {AddNotificationMessage, RunInAction} from "web-vcore";
import {AutoRun_HandleBail} from "./@Helpers.js";

let lastShareBeingLoaded;
AutoRun_HandleBail(()=>{
	const shareID = store.main.shareBeingLoaded;
	if (shareID != lastShareBeingLoaded) {
		lastShareBeingLoaded = shareID;
		if (shareID) {
			LoadShare(shareID);
		}
	}
}, {name: "LoadShare"});

function LoadHomePage() {
	RunInAction("LoadHomePage", ()=>{
		store.main.page = "home";
		store.main.home.subpage = "home";
	});
}

async function LoadShare(shareID: string) {
	Assert(shareID != null, "shareID cannot be null.");
	const share = await GetAsync(()=>GetShare(shareID));
	if (share == null) {
		AddNotificationMessage(`Could not find share with id: ${shareID} (redirecting to home page)`);
		return void LoadHomePage();
	}

	if (share.type == ShareType.map) {
		const map = await GetAsync(()=>GetMap(share.mapID));
		if (map == null) {
			AddNotificationMessage(`Could not find map with id: ${share.mapID} (redirecting to home page)`);
			return void LoadHomePage();
		}

		RunInAction("LoadShare", ()=>{
			const page: "debates" | "global" = map.id == globalMapID ? "global" : "debates";
			store.main.page = page;
			store.main[page]["subpage"] = rootPageDefaultChilds[page];
			if (page == "debates") {
				store.main[page]["selectedMapID"] = share.mapID;
			}

			if (share.mapID) {
				ACTMapViewMerge(share.mapID, share.mapView!);

				const mapUI = currentMapUI();
				mapUI?.startLoadingScroll();
			}

			//if (store.main.shareBeingLoaded == shareID)
			store.main.shareBeingLoaded = null;
		});
	}
}
