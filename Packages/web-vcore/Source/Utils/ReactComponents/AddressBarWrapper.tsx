import {VURL} from "js-vextensions";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import React from "react";
import {manager} from "../../Manager.js";
import {MaybeLog} from "../General/Logging.js";
import {loadingURL, NotifyURLLoaded, LoadURL} from "../URL/URLs.js";
import {e} from "../../PrivateExports.js";
import {Observer} from "../Store/MobX.js";

// this handles: address-bar-change (from user pressing back/forward) -> store-changes
window.addEventListener("popstate", e=>{
	//LoadURL(e.state);
	//LoadURL(VURL.FromLocationObject(window.location));
	LoadURL(VURL.Parse(window.location.href));
});

/**
 * This handles address-bar-change (from history.pushState and history.replaceState, eg. from Link components) -> store-changes.
 * (We could monkey-patch history.pushState and history.replaceState to intercept calls, but since the only calls atm are in Link.tsx, it's cleaner to just manually call this.)
*/
export function NotifyCalledHistoryReplaceOrPushState() {
	LoadURL(VURL.Parse(window.location.href));
}

let lastProcessedURL: VURL;
@Observer
export class AddressBarWrapper extends BaseComponentPlus({}, {}) {
	loadingUI = ()=>null;
	// the render function handles: store-changes -> address-bar-change
	render() {
		const newURL = manager.GetNewURL();
		const pushURL = !loadingURL && manager.DoesURLChangeCountAsPageChange(lastProcessedURL, newURL);
		// if (pushURL) Log(`Pushing: ${newURL} @oldURL:${lastURL}`);

		if (loadingURL) NotifyURLLoaded();

		if (lastProcessedURL && newURL.toString({domain: false}) === lastProcessedURL.toString({domain: false})) return null;

		if (lastProcessedURL) {
			if (pushURL) {
				history.pushState(null, null as any, newURL.toString({domain: false}));
			} else {
				history.replaceState(null, null as any, newURL.toString({domain: false}));
			}
			MaybeLog(a=>a.urlLoads, ()=>`Dispatching new-url: ${newURL} @push:${pushURL}`);
		} else {
			// if page just loaded, do one "start-up" LOCATION_CHANGED action, with whatever's in the address-bar
			/*const startURL = e.GetCurrentURL(true).toString({domain: false});
			//action = replace(startURL);
			history.replaceState(null, null, startURL.toString());*/
			MaybeLog(a=>a.urlLoads, ()=>`Dispatching start-url: ${e.GetCurrentURL()} @push:${pushURL}`);
		}

		// action.byUser = false;
		// g.justChangedURLFromCode = true;
		// action.payload.fromStateChange = true;
		// extend the "state" argument for the to-be-created history-entry (used in ActionProcessor.ts)
		//action.payload.args[1] = E(action.payload.args[1], {fromStateChange: true});

		//manager.store.dispatch(action);

		lastProcessedURL = newURL;
		return null;
	}
}