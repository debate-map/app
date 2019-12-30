import {GetSelectedProposalID} from "firebase-feedback";
import {Assert, VURL} from "js-vextensions";
import {RootState} from "Store";
import {GetNodeL2} from "Store/firebase/nodes/$node";
import {MaybeLog} from "vwebapp-framework";
import {GetSelectedUserID, GetSelectedTermID, GetSelectedImageID} from "Store/main/database";
import {GetOpenMapID, GetPage, GetSubpage} from "Store/main";
import ReactGA from "react-ga";
import {StoreAccessor} from "mobx-firelink";
import {GetMapState} from "Store/main/maps/mapStates/$mapState";
import {GetMap} from "../../Store/firebase/maps";
import {GetNodeDisplayText} from "../../Store/firebase/nodes/$node";
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

/* function ParseMapView(viewStr: string) {
	const downChars = viewStr.Matches(':').length;
	const upChars = viewStr.Matches('.').length;
	viewStr += '.'.repeat(downChars - upChars); // add .'s that were trimmed

	// let [rootNodeIDStr] = viewStr.match(/^[0-9]+/)[0];
	/* let rootNodeOwnStr = viewData.VKeys()[0];
	let rootNodeID = parseInt(rootNodeOwnStr.match(/^[0-9]+/)[0]);
	let rootNodeView = ParseNodeView(rootNodeOwnStr, viewData[rootNodeOwnStr]); *#/

	const [rootNodeID, rootNodeView] = ParseNodeView(viewStr);

	const result = {} as MapView;
	result.rootNodeViews = { [rootNodeID]: rootNodeView };
	return result;
}
/* function ParseNodeView_Old(viewStr: string) {
	let result = {} as MapNodeView;

	let ownStr = viewStr.Contains(",") ? viewStr.substr(0, viewStr.indexOf(",")) : viewStr;
	if (ownStr.Contains("s"))
		result.selected = true;
	if (ownStr.Contains("f") || ownStr.Contains("s"))
		result.focused = true;

	let childrenStr = viewStr.Contains(",") ? viewStr.slice(viewStr.indexOf(",") + 1, -1) : "";
	if (childrenStr.length) {
		result.children = {};

		let childrenStrAsJSON = `["`
			+ childrenStr.replace(/,/g, `":["`).replace(/./g, `"]`)
			+ `"]`;
	}

	return result;
} *#/
function GetDataStrForProp(ownStr: string, propChar: string) {
	const dataStart = ownStr.indexOf(`${propChar}(`) + 2;
	return ownStr.substring(dataStart, ownStr.indexOf(')', dataStart));
}
function ParseNodeView(viewStr: string): [number, MapNodeView] {
	const nodeView = new MapNodeView();

	const ownStr = viewStr.Contains(':') ? viewStr.substr(0, viewStr.indexOf(':')) : viewStr;
	const childrenStr = viewStr.Contains(':') ? viewStr.slice(viewStr.indexOf(':') + 1, -1) : '';

	const match = ownStr.match(/^(L?)([0-9]+)/);
	const isSubnode = match[1].length != 0;
	const nodeID = parseInt(match[2]);

	const ownStr_withoutParentheses = ownStr.replace(/\(.+?\)/g, '');
	if (ownStr_withoutParentheses.Contains('s')) { nodeView.selected = true; }
	if (ownStr_withoutParentheses.Contains('f')) {
		nodeView.focused = true;
		const viewOffsetStr = GetDataStrForProp(ownStr, 'f');
		const viewOffsetParts = viewOffsetStr.split('_').map(ToInt);
		nodeView.viewOffset = new Vector2i(viewOffsetParts[0], viewOffsetParts[1]);
	}
	if (ownStr_withoutParentheses.Contains('p')) {
		nodeView.openPanel = GetDataStrForProp(ownStr, 'p');
	}

	nodeView.VSet({ expanded: false, expanded_truth: false, expanded_relevance: false });
	if (ownStr_withoutParentheses.Contains('t')) {
		nodeView.expanded_truth = true;
	} else if (ownStr_withoutParentheses.Contains('r')) {
		nodeView.expanded_relevance = true;
	} else if (ownStr_withoutParentheses.Contains('e') || (childrenStr && childrenStr.length)) {
		nodeView.expanded = true;
		nodeView.expanded_truth = true;
		nodeView.expanded_relevance = true;
	}

	if (childrenStr && childrenStr.length) {
		nodeView.expanded = true;

		const childStrings = [];
		let depth = 0;
		let currentChildStr = '';
		for (const ch of childrenStr) {
			if (ch == ':') depth++;
			if (ch == '.') depth--;
			if (depth == 0 && ch == ',') {
				childStrings.push(currentChildStr);
				currentChildStr = '';
			} else {
				currentChildStr += ch;
			}
		}
		childStrings.push(currentChildStr);

		for (const childStr of childStrings) {
			const [childID, childNodeView] = ParseNodeView(childStr);
			Assert(IsNumber(childID), 'childID must be a number.');
			if (isSubnode) {
				nodeView.children[`L${childID}`] = childNodeView;
			} else {
				nodeView.children[childID] = childNodeView;
			}
		}
	}

	return [nodeID, nodeView];
} */

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

		/* if (mapID) {
			// example: /global?view=1:3:100:101f(384_111):102:.104:.....
			const mapViewStr = url.GetQueryVar('view');
			if (mapViewStr != null && mapViewStr.length) {
				const mapView = ParseMapView(mapViewStr);

				// Log("Loading map-view:" + ToJSON(mapView));
				result.push(new ACTMapViewMerge({ mapID, mapView }));
			}
		} */

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

	/* if (page == 'forum') {
		const subforumID = GetSelectedSubforumID();
		const threadID = GetSelectedThreadID();
		if (subforumID) newURL.pathNodes.push(`${subforumID}`);
		else if (threadID) newURL.pathNodes.push('*');

		if (threadID) newURL.pathNodes.push(`${threadID}`);
	} */

	if (page == "feedback") {
		const proposalID = GetSelectedProposalID();
		if (proposalID) newURL.pathNodes.push(`${proposalID}`);
	}

	if (page == "database") {
		if (subpage == "users" && GetSelectedUserID()) {
			newURL.pathNodes.push(`${GetSelectedUserID()}`);
		} else if (subpage == "terms" && GetSelectedTermID()) {
			newURL.pathNodes.push(`${GetSelectedTermID()}`);
		} else if (subpage == "images" && GetSelectedImageID()) {
			newURL.pathNodes.push(`${GetSelectedImageID()}`);
		}
	}

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

	/* if (mapID && includeMapViewStr) {
		newURL.SetQueryVar('view', GetMapViewStr(mapID));
	} */

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

// disabled for now, since the urls it generated would be too long with new UUIDs (instead, will implement "saved views" as json in db, which are then referenced by their own uuid, or maybe sequential id)
/* function GetMapViewStr(mapID: string) {
	const map = GetMap(mapID);
	if (map == null) return '';

	const rootNodeID = map.rootNode;
	let rootNodeViewStr = GetNodeViewStr(mapID, rootNodeID.toString());
	rootNodeViewStr = rootNodeViewStr.TrimEnd('.'); // remove .'s to keep shorter and cleaner
	// rootNodeViewStr += "_"; // add "_", so that Facebook doesn't cut off end special-chars
	return rootNodeViewStr;
}
export function GetNodeViewStr(mapID: string, path: string) {
	const nodeView = GetNodeView(mapID, path);
	if (nodeView == null) return '';

	let childrenStr = '';
	for (const childID of (nodeView.children || {}).VKeys(true)) {
		const childNodeViewStr = GetNodeViewStr(mapID, `${path}/${childID}`);
		if (childNodeViewStr.length) {
			childrenStr += (childrenStr.length ? ',' : '') + childNodeViewStr;
		}
	}

	const ownIDStr = path.substr(path.lastIndexOf('/') + 1);
	let ownStr = ownIDStr;
	// if (nodeView.expanded && !childrenStr.length) ownStr += "e";
	// let mapView = GetMapView(mapID);
	if (nodeView.selected) {
		ownStr += 's';

		/* let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
		let nodeBox = $(".NodeUI_Inner").ToList().FirstOrX(a=>(FindReact(a[0]) as NodeUI_Inner).props.path == path);
		let nodeBoxComp = FindReact(nodeBox[0]) as NodeUI_Inner;
		let viewOffset = viewCenter_onScreen.Minus(nodeBox.GetScreenRect().Position).NewX(x=>x.RoundTo(1)).NewY(y=>y.RoundTo(1));
		let offsetStr = viewOffset.toString().replace(" ", "_");
		ownStr += `(${offsetStr})`; *#/
	}
	if (nodeView.focused) { // && GetSelectedNodeID(mapID) == null) {
		Assert(nodeView.viewOffset != null);
		const offsetStr = Vector2i.prototype.toString.call(nodeView.viewOffset).replace(' ', '_');
		ownStr += `f(${offsetStr})`;
	}
	if (nodeView.openPanel) {
		ownStr += `p(${nodeView.openPanel})`;
	}

	/* let hasData = false;
	if (childrenStr.length) hasData = true;
	else if (nodeView.expanded) hasData = true; *#/
	const hasData = ownStr.length > ownIDStr.length || nodeView.expanded;
	if (!hasData) return '';

	let result = ownStr;
	if (nodeView.expanded) {
		let prefix = '';
		if (nodeView.expanded_truth && !nodeView.expanded_relevance) {
			prefix = 't';
		} else if (nodeView.expanded_relevance && !nodeView.expanded_truth) {
			prefix = 'r';
		} else {
			// only include e if children-str is empty (if has child-str, then e is implied/not-needed)
			if (childrenStr.length == 0) {
				prefix = 'e';
			}
		}

		result += prefix;
		if (childrenStr.length) {
			result += `:${childrenStr}.`;
		}
	}
	return result;
} */

export function DoesURLChangeCountAsPageChange(oldURL: VURL, newURL: VURL) {
	if (oldURL == null) return true;
	if (oldURL.PathStr() != newURL.PathStr()) return true;

	/* let oldSyncLoadActions = GetSyncLoadActionsForURL(oldURL, directURLChange);
	let oldMapViewMergeAction = oldSyncLoadActions.find(a=>a.Is(ACTMapViewMerge));

	let newSyncLoadActions = GetSyncLoadActionsForURL(newURL, directURLChange);
	let newMapViewMergeAction = newSyncLoadActions.find(a=>a.Is(ACTMapViewMerge));

	let oldViewStr = oldURL.GetQueryVar("view");
	let oldURLWasTemp = oldViewStr == "";
	if (newMapViewMergeAction != oldMapViewMergeAction && !oldURLWasTemp) {
		//let oldFocused = GetFocusedNodePath(GetMapView(mapViewMergeAction.payload.mapID));
		let oldFocused = oldMapViewMergeAction ? GetFocusedNodePath(oldMapViewMergeAction.payload.mapView) : null;
		let newFocused = newMapViewMergeAction ? GetFocusedNodePath(newMapViewMergeAction.payload.mapView) : null;
		if (newFocused != oldFocused) return true;
	} */

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