import {VURL, GetCurrentURLString} from "js-vextensions";

export const rootPages = [
	"stream", "chat", "reputation",
	"database", "feedback", "forum", "more",
	"home",
	"social", "personal", "debates", "global",
	"search", "guide", "profile"
];
// a default-child is only used (ie. removed from url) if there are no path-nodes after it
export const rootPageDefaultChilds = {
	more: "links",
	home: "home",
	content: "terms",
	global: "map",
}

export function GetCurrentURL(fromAddressBar = false) {
	return fromAddressBar ? VURL.Parse(GetCurrentURLString()) : VURL.FromState(State("router"));
}

export function NormalizeURL(url: VURL) {
	let result = url.Clone();
	if (!rootPages.Contains(result.pathNodes[0])) {
		result.pathNodes.Insert(0, "home");
	}
	if (result.pathNodes[1] == null && rootPageDefaultChilds[result.pathNodes[0]]) {
		result.pathNodes.Insert(1, rootPageDefaultChilds[result.pathNodes[0]]);
	}
	return result;
}