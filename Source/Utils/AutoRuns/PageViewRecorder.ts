import {autorun} from "mobx";
import {GetCurrentURL_SimplifiedForPageViewTracking, DoesURLChangeCountAsPageChange, RecordPageView} from "Source/Utils/URL/URLs";

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