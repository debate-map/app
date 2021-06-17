import {GetMap, GetShare, MapType, ShareType} from "dm_common";
import {Assert} from "web-vcore/nm/js-vextensions";
import {autorun, runInAction} from "web-vcore/nm/mobx";
import {GetAsync} from "web-vcore/nm/mobx-graphlink";
import {store} from "Store";
import {AddNotificationMessage} from "Store/main/@NotificationMessage";
import {ACTMapViewMerge} from "Store/main/maps/mapViews/$mapView";
import {MapUI} from "UI/@Shared/Maps/MapUI";
import {rootPageDefaultChilds} from "Utils/URL/URLs";

let lastShareBeingLoaded;
autorun(()=>{
	const shareID = store.main.shareBeingLoaded;
	if (shareID != lastShareBeingLoaded) {
		lastShareBeingLoaded = shareID;
		if (shareID) {
			LoadShare(shareID);
		}
	}
}, {name: "LoadShare"});

function LoadHomePage() {
	runInAction("LoadHomePage", ()=>{
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

	if (share.type == ShareType.Map) {
		const map = await GetAsync(()=>GetMap(share.mapID));
		if (map == null) {
			AddNotificationMessage(`Could not find map with id: ${share.mapID} (redirecting to home page)`);
			return void LoadHomePage();
		}

		runInAction("LoadShare", ()=>{
			const page: "private" | "public" | "global" = map.type == MapType.Private ? "private" : map.type == MapType.Public ? "public" : "global";
			store.main.page = page;
			store.main[page]["subpage"] = rootPageDefaultChilds[page];
			store.main[page]["selectedMapID"] = share.mapID;
			ACTMapViewMerge(share.mapID, share.mapView);

			// const mapUI = FindReact(document.querySelector('.MapUI')) as MapUI;
			const mapUI = MapUI.CurrentMapUI;
			if (mapUI) {
				mapUI.StartLoadingScroll();
			}

			//if (store.main.shareBeingLoaded == shareID)
			store.main.shareBeingLoaded = null;
		});
	}
}