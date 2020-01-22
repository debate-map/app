import {GetSelectedProposalID} from "firebase-feedback";
import {Assert, VURL} from "js-vextensions";
import {StoreAccessor} from "mobx-firelink";
import ReactGA from "react-ga";
import {RootState} from "Store";
import {GetNodeL2, GetNodeDisplayText} from "Store/firebase/nodes/$node";
import {GetOpenMapID, GetPage, GetSubpage} from "Store/main";
import {GetSelectedImageID, GetSelectedTermID, GetSelectedUserID} from "Store/main/database";
import {GetMapState} from "Store/main/maps/mapStates/$mapState";
import {MaybeLog} from "vwebapp-framework";
import {GetMap} from "../../Store/firebase/maps";
import {MapNodeL2} from "../../Store/firebase/nodes/@MapNode";

export const rootPages = [
	"stream", "chat", "reputation",
	"database", "feedback", "forum", "more",
	"home",
	"social", "private", "public", "global",
	"search", "guide", "profile",
];
// a default-child is only used (ie. removed from url) if there are no path-nodes after it
export const rootPageDefaultChilds = {
	database: "users",
	feedback: "proposals",
	more: "links",
	home: "home",
	global: "map",
};

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
	result = `${result.TrimStart("-").TrimEnd("-")}.${map._key.toString()}`;
	return result;
}

export function GetCrawlerURLStrForNode(node: MapNodeL2) {
	let result = GetNodeDisplayText(node).toLowerCase().replace(/[^a-z0-9]/g, "-");
	// need to loop, in some cases, since regex doesn't reprocess "---" as two sets of "--".
	while (result.Contains("--")) {
		result = result.replace(/--/g, "-");
	}
	result = `${result.TrimStart("-").TrimEnd("-")}.${node._key.toString()}`;
	return result;
}
export function GetCurrentURL_SimplifiedForPageViewTracking() {
	// let result = URL.Current();
	const result = GetNewURL(false);

	/* const mapID = GetOpenMapID();
	const onMapPage = NormalizeURL(result).toString({ domain: false }).startsWith('/global/map');
	if (mapID && onMapPage) {
		const nodeID = GetFocusedNodeID(mapID);
		const node = nodeID ? GetNodeL2(nodeID) : null;
		// if (result.pathNodes.length == 1) {
		/* if (NormalizeURL(result).toString({domain: false}).startsWith("/global/map") && result.pathNodes.length == 1) {
			result.pathNodes.push("map");
		} *#/
		if (node) {
			result = NormalizeURL(result);
			result.pathNodes.push(GetCrawlerURLStrForNode(node));
		}
	} */

	return result;
}

// loading
// ==========

const pagesWithSimpleSubpages = ["database", "feedback", "more", "home", "global"].ToMap(page=>page, ()=>null);
export function GetLoadActionFuncForURL(url: VURL) {
	return (store: RootState)=>{
		url = NormalizeURL(url);
		const page = url.pathNodes[0];
		store.main.page = page;
		const subpage = url.pathNodes[1];
		if (url.pathNodes[1] && page in pagesWithSimpleSubpages) {
			store.main[page].subpage = subpage;
		}

		// load query-vars
		if (url.GetQueryVar("extra")) store.main.urlExtraStr = url.GetQueryVar("extra") == "null" ? null : url.GetQueryVar("extra");
		if (url.GetQueryVar("env")) store.main.envOverride = url.GetQueryVar("env") == "null" ? null : url.GetQueryVar("env");
		if (url.GetQueryVar("db")) store.main.dbOverride = url.GetQueryVar("db") == "null" ? null : url.GetQueryVar("db");
		if (url.GetQueryVar("dbVersion")) store.main.dbVersionOverride = url.GetQueryVar("dbVersion") == "null" ? null : url.GetQueryVar("dbVersion");
		if (url.GetQueryVar("analyticsEnabled")) store.main.analyticsEnabled = url.GetQueryVar("analyticsEnabled") == "true";

		/* if (url.pathNodes[0] == 'forum') {
			const subforumStr = url.pathNodes[1];
			if (subforumStr != '*') {
				const subforumIDMatch = subforumStr && subforumStr.match(/([0-9]+)$/);
				const subforumID = subforumIDMatch ? subforumIDMatch[1].ToInt() : null;
				result.push(new ACTSubforumSelect({ id: subforumID }));
			}

			const threadStr = url.pathNodes[2];
			const threadIDMatch = threadStr && threadStr.match(/([0-9]+)$/);
			const threadID = threadIDMatch ? threadIDMatch[1].ToInt() : null;
			result.push(new ACTThreadSelect({ id: threadID }));
		} */

		if (page == "feedback") {
			if (subpage == "proposals") {
				const idStr = url.pathNodes[2];
				const idStrMatch = idStr && idStr.match(/([A-Za-z0-9_-]+)$/);
				const proposalID = idStrMatch ? idStrMatch[1] : null;
				store.feedback.main.proposals.selectedProposalID = proposalID!;
			}
		}

		let mapID: string|n;
		if (page == "database") {
			const subpageInURL = url.pathNodes[1] != null;
			const entryID = url.pathNodes[2] || null; // null needed, else reducer complains
			if (subpage == "users" && subpageInURL) {
				store.main.database.selectedUserID = entryID!;
			} else if (subpage == "terms" && subpageInURL) {
				store.main.database.selectedTermID = entryID!;
			} else if (subpage == "images" && subpageInURL) {
				store.main.database.selectedImageID = entryID!;
			}
		} else if (page == "private" || page == "public") {
			const urlStr = url.pathNodes[1];
			const match = urlStr && urlStr.match(/([A-Za-z0-9_-]+)$/);
			mapID = match ? match[1] : null;

			if (page == "private") {
				store.main.private.selectedMapID = mapID!;
			} else {
				store.main.public.selectedMapID = mapID!;
			}
		} else if (page == "global") {
			/* if (subpage == 'map') {
				mapID = globalMapID;
				if (isBot) {
					// example: /global/map/some-node.123
					const lastPathNode = url.pathNodes.LastOrX();
					const crawlerURLMatch = lastPathNode && lastPathNode.match(/(^|\\.)([A-Za-z0-9_-]{22})$/);
					if (isBot) {
						if (crawlerURLMatch) {
							const nodeID = parseInt(crawlerURLMatch[1]);
							result.push(new ACTSet(`main/mapViews/${1}/bot_currentNodeID`, nodeID));
						} else { // if (directURLChange) {
							result.push(new ACTSet(`main/mapViews/${1}/bot_currentNodeID`, null));
						}
					}
				}
			} */
		}

		/* if (url.GetQueryVar('timeline')) {
			result.push(new ACTMap_PlayingTimelineSet({ mapID, timelineID: url.GetQueryVar('timeline') }));
		}
		if (url.GetQueryVar('step')) {
			result.push(new ACTMap_PlayingTimelineStepSet({ mapID, stepIndex: ToInt(url.GetQueryVar('step')) - 1 }));
		}
		if (url.GetQueryVar('appliedStep')) {
			result.push(new ACTMap_PlayingTimelineAppliedStepSet({ mapID, stepIndex: ToInt(url.GetQueryVar('appliedStep')) - 1 }));
		} */

		// If user followed search-result link (eg. "debatemap.live/global/156"), we only know the node-id.
		// Search for the shortest path from the map's root to this node, and update the view and url to that path.
		// if (url.pathNodes[0] == "global" && url.pathNodes[1] != null && url.pathNodes[1].match(/^[0-9]+$/) && !isBot) {
		/* const match = url.toString({ domain: false }).match(/^\/global\/map\/[a-z-]*\.?([0-9]+)$/);
		if (match && !isBot) {
			const nodeID = parseInt(match[1]);
			result.push(new ACTSearchForNode({nodeID}));

			const node = await GetAsync(() => GetNodeL2(nodeID));
			if (node) {
				const shortestPathToNode = await GetAsync(() => GetShortestPathFromRootToNode(1, node));
				if (shortestPathToNode) {
					const mapViewForPath = CreateMapViewForPath(shortestPathToNode);
					// Log(`Found shortest path (${shortestPathToNode}), so merging: ` + ToJSON(mapViewForPath));
					store.dispatch(new ACTMapViewMerge({ mapID: 1, mapView: mapViewForPath }));
				} else {
					AddNotificationMessage(new NotificationMessage(`Could not find a path to the node specified in the url (#${nodeID}, title: "${GetNodeDisplayText(node)}").`));
				}
			} else {
				AddNotificationMessage(new NotificationMessage(`The node specified in the url (#${nodeID}) was not found.`));
			}

			/* let newURL = url.Clone();
			//newURL.pathNodes.RemoveAt(2);
			store.dispatch(replace(newURL.toString({domain: false}))); *#/
		} */

		/* if (url.toString({ domain: false }).startsWith('/global/map')) {
			if (isBot) {
				/* let newURL = url.Clone();
				let node = await GetNodeAsync(nodeID);
				let node = await GetNodeAsync(nodeID);
				newURL.pathNodes[1] = "";
				store.dispatch(replace(newURL.toString(false))); *#/
			} else {
				// we don't yet have a good way of knowing when loading is fully done; so just do a timeout
				/* WaitXThenRun(0, UpdateURL, 200);
				WaitXThenRun(0, UpdateURL, 400);
				WaitXThenRun(0, UpdateURL, 800);
				WaitXThenRun(0, UpdateURL, 1600); *#/
			}
		} */
	};
}

// saving
// ==========

// g.justChangedURLFromCode = false;
export const GetNewURL = StoreAccessor(s=>(includeMapViewStr = true)=>{
	// let newURL = URL.Current();
	/* let oldURL = URL.Current(true);
	let newURL = new VURL(oldURL.domain, oldURL.pathNodes); */

	const newURL = new VURL();
	const page = GetPage();
	newURL.pathNodes.push(page);

	const subpage = GetSubpage();
	if (page in pagesWithSimpleSubpages) {
		newURL.pathNodes.push(subpage);
	}

	// query vars
	if (s.main.urlExtraStr) newURL.SetQueryVar("extra", s.main.urlExtraStr);
	if (!s.main.analyticsEnabled && newURL.GetQueryVar("analytics") == null) newURL.SetQueryVar("analytics", "false");
	if (s.main.envOverride) newURL.SetQueryVar("env", s.main.envOverride);
	if (s.main.dbOverride) newURL.SetQueryVar("db", s.main.dbOverride);
	if (s.main.dbVersionOverride) newURL.SetQueryVar("dbVersion", s.main.dbVersionOverride);
	/* if (mapID && includeMapViewStr) {
		newURL.SetQueryVar('view', GetMapViewStr(mapID));
	} */

	if (page == "database") {
		if (subpage == "users" && GetSelectedUserID()) {
			newURL.pathNodes.push(`${GetSelectedUserID()}`);
		} else if (subpage == "terms" && GetSelectedTermID()) {
			newURL.pathNodes.push(`${GetSelectedTermID()}`);
		} else if (subpage == "images" && GetSelectedImageID()) {
			newURL.pathNodes.push(`${GetSelectedImageID()}`);
		}
	}

	if (page == "feedback") {
		const proposalID = GetSelectedProposalID();
		if (proposalID) newURL.pathNodes.push(`${proposalID}`);
	}
	
	/* if (page == 'forum') {
		const subforumID = GetSelectedSubforumID();
		const threadID = GetSelectedThreadID();
		if (subforumID) newURL.pathNodes.push(`${subforumID}`);
		else if (threadID) newURL.pathNodes.push('*');

		if (threadID) newURL.pathNodes.push(`${threadID}`);
	} */

	let mapID: string|n;
	if (page == "private") {
		mapID = s.main.private.selectedMapID;
		if (mapID) {
			// newURL.pathNodes.push(mapID+"");
			const urlStr = GetCrawlerURLStrForMap(mapID);
			newURL.pathNodes.push(urlStr);
		}
	}
	if (page == "public") {
		mapID = s.main.public.selectedMapID;
		if (mapID) {
			// newURL.pathNodes.push(mapID+"");
			const urlStr = GetCrawlerURLStrForMap(mapID);
			newURL.pathNodes.push(urlStr);
		}
	}
	if (page == "global" && subpage == "map") {
		mapID = GetOpenMapID();
		if (isBot) {
			const map = GetMap(mapID);
			// const rootNodeID = store.main.mapViews.get(mapID).rootNodeID;
			const rootNodeID = map.rootNode;
			const rootNode = GetNodeL2(rootNodeID);
			if (rootNode) {
				const nodeStr = GetCrawlerURLStrForNode(rootNode);
				if (rootNodeID && rootNodeID != map.rootNode) {
					newURL.pathNodes.push(nodeStr);
				}
			}
		}
	}

	const mapState = GetMapState(mapID);
	// const playingTimeline = mapInfo && mapInfo.playingTimeline;
	const playingTimeline = mapState?.selectedTimeline;
	if (playingTimeline) {
		newURL.SetQueryVar("timeline", playingTimeline);

		const playingTimeline_step = mapID ? mapState.playingTimeline_step : null;
		if (playingTimeline_step != null) {
			newURL.SetQueryVar("step", playingTimeline_step + 1);
		}

		const playingTimeline_appliedStep = mapID ? mapState.playingTimeline_appliedStep : null;
		if (playingTimeline_appliedStep != null) {
			newURL.SetQueryVar("appliedStep", playingTimeline_appliedStep + 1);
		}
	}

	// a default-child is only used (ie. removed from url) if there are no path-nodes after it
	if (subpage && subpage == rootPageDefaultChilds[page] && newURL.pathNodes.length == 2) newURL.pathNodes.length = 1;
	if (page == "home" && newURL.pathNodes.length == 1) newURL.pathNodes.length = 0;

	Assert(!newURL.pathNodes.Any(a=>a == "/"), `A path-node cannot be just "/". @url(${newURL})`);

	return newURL;
});

export function DoesURLChangeCountAsPageChange(oldURL: VURL, newURL: VURL) {
	if (oldURL == null) return true;
	if (oldURL.PathStr() != newURL.PathStr()) return true;

	return false;
}

export function RecordPageView(url: VURL) {
	// let url = window.location.pathname;
	if (PROD) {
		// todo: ms if react-ga is not initialized yet, we buffer up these commands, then run them once it is initialized
		ReactGA.set({page: url.toString({domain: false})});
		ReactGA.pageview(url.toString({domain: false}) || "/");
	}
	MaybeLog(a=>a.pageViews, ()=>`Page-view: ${url}`);
}