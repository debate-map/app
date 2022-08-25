import {GetMap, GetNodeDisplayText, MapNodeL2} from "dm_common";
import {RootState, store} from "Store";
import {GetPage, GetSubpage} from "Store/main";
import {Page} from "web-vcore";
import {Assert, VURL} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";

// for subpages, each page's first one is the default
export const pageTree = new Page({}, {
	home: new Page({}),
	logs: new Page({}),
	db: new Page({}, {
		requests: new Page({}),
		watchers: new Page({}),
		migrate: new Page({}),
	}),
	testing: new Page(),
	netdata: new Page(),
	grafana: new Page(),
	prometheus: new Page(),
	pixie: new Page(),
});
export const rootPages = Object.keys(pageTree.children);
export const rootPageDefaultChilds = Object.entries(pageTree.children)
	.filter(pair=>Object.entries(pair[1].children ?? {}).length > 0)
	.ToMapObj(pair=>pair[0], pair=>{
		return Object.keys(pair[1].children)[0];
	});

export function PushHistoryEntry() {
	// history.pushState({}, document.title, GetNewURL());
	history.pushState({}, document.title, window.location.href);
}

export function NormalizeURL(url: VURL) {
	const result = url.Clone();
	if (!rootPages.Contains(result.pathNodes[0])) {
		result.pathNodes.Insert(0, "home");
	}
	if (result.pathNodes[1] == null && rootPageDefaultChilds[result.pathNodes[0]]) {
		result.pathNodes.Insert(1, rootPageDefaultChilds[result.pathNodes[0]]);
	}
	return result;
}

export function GetCrawlerURLStrForMap(mapID: string) {
	const map = GetMap(mapID);
	if (map == null) return mapID.toString();

	let result = map.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
	// need to loop, in some cases, since regex doesn't reprocess "---" as two sets of "--".
	while (result.Contains("--")) {
		result = result.replace(/--/g, "-");
	}
	result = `${result.TrimStart("-").TrimEnd("-")}.${map.id.toString()}`;
	return result;
}

export function GetCrawlerURLStrForNode(node: MapNodeL2) {
	let result = GetNodeDisplayText(node).toLowerCase().replace(/[^a-z0-9]/g, "-");
	// need to loop, in some cases, since regex doesn't reprocess "---" as two sets of "--".
	while (result.Contains("--")) {
		result = result.replace(/--/g, "-");
	}
	result = `${result.TrimStart("-").TrimEnd("-")}.${node.id.toString()}`;
	return result;
}
export function GetCurrentURL_SimplifiedForPageViewTracking() {
	const result = GetNewURL();
	return result;
}

// loading
// ==========

export function GetLoadActionFuncForURL(url: VURL) {
	return (store: RootState)=>{
		url = NormalizeURL(url);
		const page = url.pathNodes[0];
		store.main.page = page;
		const subpage = url.pathNodes[1];
		if (url.pathNodes[1] && pageTree.children[page]?.simpleSubpages) {
			store.main[page].subpage = subpage;
		}

		// load query-vars
		store.main.urlOtherFlags = [];
		for (const param of url.queryVars) {
			if (param.name == "extra") store.main.urlExtraStr = param.value == "null" ? null : param.value;
			/*else if (param.name == "env") store.main.envOverride = param.value == "null" ? null : param.value;
			else if (param.name == "db") store.main.dbOverride = param.value == "null" ? null : param.value;*/
			else {
				store.main.urlOtherFlags.push({name: param.name, value: param.value});
			}
		}
	};
}

// saving
// ==========

//export const GetNewURL = CreateAccessor(function(includeMapViewStr = true) {
export function GetNewURL() {
	//const s = this!.store;
	const s = store;

	const newURL = new VURL();
	const page = GetPage();
	newURL.pathNodes.push(page);

	var subpage = GetSubpage();
	if (pageTree.children[page]?.simpleSubpages && subpage) {
		newURL.pathNodes.push(subpage);
	}

	// query vars
	if (s.main.urlExtraStr) newURL.SetQueryVar("extra", s.main.urlExtraStr);
	for (const param of s.main.urlOtherFlags) {
		newURL.SetQueryVar(param.name, param.value);
	}

	// nowadays, we only remove the page and subpage for the /home/home path (it's not worth making urls more brittle just for slightly shorter urls) 
	if (page == "home" && subpage == "home") newURL.pathNodes.length = 0;

	Assert(!newURL.pathNodes.Any(a=>a == "/"), `A path-node cannot be just "/". @url(${newURL})`);

	return newURL;
}

export function DoesURLChangeCountAsPageChange(oldURL: VURL, newURL: VURL) {
	if (oldURL == null) return true;
	if (oldURL.PathStr() != newURL.PathStr()) return true;

	return false;
}