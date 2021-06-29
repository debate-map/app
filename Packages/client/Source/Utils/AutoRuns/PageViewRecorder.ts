import {autorun} from "web-vcore/nm/mobx.js";
import {GetCurrentURL_SimplifiedForPageViewTracking, DoesURLChangeCountAsPageChange, RecordPageView} from "Utils/URL/URLs.js";

let pageViewTracker_lastURL;
autorun(()=>{
	// const url = GetCurrentURL();
	// let oldURL = URL.Current();
	// let url = VURL.FromLocationObject(action.payload.location);
	const simpleURL = GetCurrentURL_SimplifiedForPageViewTracking();
	if (DoesURLChangeCountAsPageChange(pageViewTracker_lastURL, simpleURL)) {
		pageViewTracker_lastURL = simpleURL;
		RecordPageView(simpleURL);
	}
}, {name: "PageViewRecorder"});