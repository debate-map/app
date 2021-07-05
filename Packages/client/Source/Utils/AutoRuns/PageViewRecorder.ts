import {DoesURLChangeCountAsPageChange, GetCurrentURL_SimplifiedForPageViewTracking, RecordPageView} from "Utils/URL/URLs.js";
import {AutoRun_HandleBail} from "./@Helpers.js";

let pageViewTracker_lastURL;
AutoRun_HandleBail(()=>{
	// const url = GetCurrentURL();
	// let oldURL = URL.Current();
	// let url = VURL.FromLocationObject(action.payload.location);
	const simpleURL = GetCurrentURL_SimplifiedForPageViewTracking();
	if (DoesURLChangeCountAsPageChange(pageViewTracker_lastURL, simpleURL)) {
		pageViewTracker_lastURL = simpleURL;
		RecordPageView(simpleURL);
	}
}, {name: "PageViewRecorder"});