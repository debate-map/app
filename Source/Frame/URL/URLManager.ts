import {replace, push} from "redux-little-router";
import {ToInt} from "js-vextensions";
import {Vector2i} from "js-vextensions";
import {NodeUI_Inner} from "../../UI/@Shared/Maps/MapNode/NodeUI_Inner";
import {GetOpenMapID, ACTSetPage, ACTSetSubpage, ACTNotificationMessageAdd, GetPage, GetSubpage} from "../../Store/main";
import {GetMap} from "../../Store/firebase/maps";
import {GetNodeView, GetMapView, GetSelectedNodeID, GetViewOffset, GetFocusedNodeID} from "../../Store/main/mapViews";
import {MapView, MapNodeView} from "../../Store/main/mapViews/@MapViews";
import {ACTMapViewMerge} from "../../Store/main/mapViews/$mapView";
import {rootPageDefaultChilds, NormalizeURL} from "../General/URLs";
import {VURL} from "js-vextensions";
import {ACTTermSelect, ACTImageSelect} from "../../Store/main/database";
import { GetNodeDisplayText } from "../../Store/firebase/nodes/$node";
import { GetNode } from "Store/firebase/nodes";
import { GetShortestPathFromRootToNode } from "Frame/Store/PathFinder";
import {CreateMapViewForPath} from "../Store/PathFinder";
import NotificationMessage from "../../Store/main/@NotificationMessage";
import { ACTDebateMapSelect } from "../../Store/main/debates";
import { ACTSet } from "Store";
import {MapUI} from "../../UI/@Shared/Maps/MapUI";
import {MapNode, globalMapID, MapNodeL2} from "../../Store/firebase/nodes/@MapNode";
import {Map} from "../../Store/firebase/maps/@Map";
import {ACTPersonalMapSelect} from "../../Store/main/personal";
import { ACTMap_PlayingTimelineSet, ACTMap_PlayingTimelineStepSet } from "Store/main/maps/$map";
import {ACTMap_PlayingTimelineAppliedStepSet} from "../../Store/main/maps/$map";
import {ACTSubforumSelect, ACTThreadSelect, GetSelectedSubforumID, GetSelectedThreadID} from "firebase-forum";
import {FindReact} from "react-vextensions";
import {ACTProposalSelect, GetSelectedProposalID} from "firebase-feedback";
import {GetAsync} from "Frame/Database/DatabaseHelpers";
import {GetNodeL2} from "Store/firebase/nodes/$node";

export function GetCrawlerURLStrForMap(mapID: number) {
	let map = GetMap(mapID);
	if (map == null) return mapID.toString();

	let result = map.name.toLowerCase().replace(/[^a-z]/g, "-");
	// need to loop, in some cases, since regex doesn't reprocess "---" as two sets of "--".
	while (result.Contains("--")) {
		result = result.replace(/--/g, "-");
	}
	result = result.TrimStart("-").TrimEnd("-") + "." + map._id.toString();
	return result;
}

export function GetCrawlerURLStrForNode(node: MapNodeL2) {
	let result = GetNodeDisplayText(node).toLowerCase().replace(/[^a-z]/g, "-");
	// need to loop, in some cases, since regex doesn't reprocess "---" as two sets of "--".
	while (result.Contains("--")) {
		result = result.replace(/--/g, "-");
	}
	result = result.TrimStart("-").TrimEnd("-") + "." + node._id.toString();
	return result;
}
export function GetCurrentURL_SimplifiedForPageViewTracking() {
	//let result = URL.Current();
	let result = GetNewURL(false);

	let mapID = GetOpenMapID();
	let onMapPage = NormalizeURL(result).toString({domain: false}).startsWith("/global/map");
	if (mapID && onMapPage) {
		let nodeID = GetFocusedNodeID(mapID);
		let node = nodeID ? GetNodeL2(nodeID) : null;
		//if (result.pathNodes.length == 1) {
		/*if (NormalizeURL(result).toString({domain: false}).startsWith("/global/map") && result.pathNodes.length == 1) {
			result.pathNodes.push("map");
		}*/
		if (node) {
			result = NormalizeURL(result);
			result.pathNodes.push(GetCrawlerURLStrForNode(node));
		}
	}
	return result;
}

// loading
// ==========

function ParseMapView(viewStr: string) {
	let downChars = viewStr.Matches(":").length;
	let upChars = viewStr.Matches(".").length;
	viewStr += ".".repeat(downChars - upChars); // add .'s that were trimmed

	//let [rootNodeIDStr] = viewStr.match(/^[0-9]+/)[0];
	/*let rootNodeOwnStr = viewData.VKeys()[0];
	let rootNodeID = parseInt(rootNodeOwnStr.match(/^[0-9]+/)[0]);
	let rootNodeView = ParseNodeView(rootNodeOwnStr, viewData[rootNodeOwnStr]);*/

	let [rootNodeID, rootNodeView] = ParseNodeView(viewStr);
	
	let result = {} as MapView;
	result.rootNodeViews = {[rootNodeID]: rootNodeView};
	return result;
}
/*function ParseNodeView(viewStr: string) {
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
}*/
function GetDataStrForProp(ownStr: string, propChar: string) {
	let dataStart = ownStr.indexOf(propChar + "(") + 2;
	return ownStr.substring(dataStart, ownStr.indexOf(")", dataStart));
}
function ParseNodeView(viewStr: string): [number, MapNodeView] {
	let nodeView = new MapNodeView();

	let ownStr = viewStr.Contains(":") ? viewStr.substr(0, viewStr.indexOf(":")) : viewStr;
	let childrenStr = viewStr.Contains(":") ? viewStr.slice(viewStr.indexOf(":") + 1, -1) : "";

	let match = ownStr.match(/^(L?)([0-9]+)/);
	let isSubnode = match[1].length != 0;
	let nodeID = parseInt(match[2]);

	let ownStr_withoutParentheses = ownStr.replace(/\(.+?\)/g, "");
	if (ownStr_withoutParentheses.Contains("s"))
		nodeView.selected = true;
	if (ownStr_withoutParentheses.Contains("f")) {
		nodeView.focused = true;
		let viewOffsetStr = GetDataStrForProp(ownStr, "f");
		let viewOffsetParts = viewOffsetStr.split("_").map(ToInt);
		nodeView.viewOffset = new Vector2i(viewOffsetParts[0], viewOffsetParts[1]);
	}
	if (ownStr_withoutParentheses.Contains("p")) {
		nodeView.openPanel = GetDataStrForProp(ownStr, "p");
	}

	let fullyExpanded = ownStr_withoutParentheses.Contains("e") || (childrenStr && childrenStr.length);

	if (fullyExpanded) {
		nodeView.expanded = true;
		nodeView.expanded_truth = true;
		nodeView.expanded_relevance = true;
	} else if (ownStr_withoutParentheses.Contains("t")) {
		nodeView.expanded = true;
		nodeView.expanded_truth = true;
	} else if (ownStr_withoutParentheses.Contains("r")) {
		nodeView.expanded = true;
		nodeView.expanded_relevance = true;
	}

	if (childrenStr && childrenStr.length) {
		nodeView.expanded = true;

		let childStrings = [];
		let depth = 0;
		let currentChildStr = "";
		for (let ch of childrenStr) {
			if (ch == ":") depth++;
			if (ch == ".") depth--;
			if (depth == 0 && ch == ",") {
				childStrings.push(currentChildStr);
				currentChildStr = "";
			} else {
				currentChildStr += ch;
			}
		}
		childStrings.push(currentChildStr);

		for (let childStr of childStrings) {
			let [childID, childNodeView] = ParseNodeView(childStr);
			Assert(IsNumber(childID), "childID must be a number.");
			if (isSubnode) {
				nodeView.subnodes[childID] = childNodeView;
			} else {
				nodeView.children[childID] = childNodeView;
			}
		}
	}

	return [nodeID, nodeView];
}

const pagesWithSimpleSubpages = ["database", "feedback", "more", "home", "global"].ToMap(page=>page, ()=>null);
export function GetSyncLoadActionsForURL(url: VURL, directURLChange: boolean) {
	let result = [];

	let page = url.pathNodes[0];
	result.push(new ACTSetPage(page).VSet({fromURL: true}));
	let subpage = url.pathNodes[1];
	if (url.pathNodes[1] && page in pagesWithSimpleSubpages) {
		result.push(new ACTSetSubpage({page, subpage}).VSet({fromURL: true}));
	}

	if (url.pathNodes[0] == "forum") {
		let subforumStr = url.pathNodes[1];
		if (subforumStr != "*") {
			let subforumIDMatch = subforumStr && subforumStr.match(/([0-9]+)$/);
			let subforumID = subforumIDMatch ? subforumIDMatch[1].ToInt() : null;
			result.push(new ACTSubforumSelect({id: subforumID}));
		}

		let threadStr = url.pathNodes[2];
		let threadIDMatch = threadStr && threadStr.match(/([0-9]+)$/);
		let threadID = threadIDMatch ? threadIDMatch[1].ToInt() : null;
		result.push(new ACTThreadSelect({id: threadID}));
	}

	if (url.pathNodes[0] == "feedback") {
		if (url.pathNodes[1] == "proposals") {
			let idStr = url.pathNodes[2];
			let idStrMatch = idStr && idStr.match(/([0-9]+)$/);
			let proposalID = idStrMatch ? idStrMatch[1].ToInt() : null;
			result.push(new ACTProposalSelect({id: proposalID}));
		}
	}

	if (page == "database") {
		if (subpage == "terms" && url.pathNodes[2]) {
			result.push(new ACTTermSelect({id: url.pathNodes[2].ToInt()}).VSet({fromURL: true}));
		} else if (subpage == "images" && url.pathNodes[2]) {
			result.push(new ACTImageSelect({id: url.pathNodes[2].ToInt()}).VSet({fromURL: true}));
		}
	}

	var mapID: number;
	if (url.pathNodes[0] == "personal") {
		let urlStr = url.pathNodes[1];
		let match = urlStr && urlStr.match(/([0-9]+)$/);
		mapID = match ? match[1].ToInt() : null;
		result.push(new ACTPersonalMapSelect({id: mapID}).VSet({fromURL: true}));
	}
	if (url.pathNodes[0] == "debates") { //&& IsNumberString(url.pathNodes[1])) {
		let urlStr = url.pathNodes[1];
		let match = urlStr && urlStr.match(/([0-9]+)$/);
		mapID = match ? match[1].ToInt() : null;
		result.push(new ACTDebateMapSelect({id: mapID}).VSet({fromURL: true}));
	}
	if (url.pathNodes[0] == "global" && url.pathNodes[0] == "map") {
		mapID = globalMapID;
		if (isBot) {
			// example: /global/map/some-node.123
			let lastPathNode = url.pathNodes.LastOrX();
			let crawlerURLMatch = lastPathNode && lastPathNode.match(/([0-9]+)$/);
			if (isBot) {
				if (crawlerURLMatch) {
					let nodeID = parseInt(crawlerURLMatch[1]);
					result.push(new ACTSet(`main/mapViews/${1}/bot_currentNodeID`, nodeID));
				} else if (directURLChange) {
					result.push(new ACTSet(`main/mapViews/${1}/bot_currentNodeID`, null));
				}
			}
		}
	}

	if (mapID) {
		// example: /global?view=1:3:100:101f(384_111):102:.104:.....
		let mapViewStr = url.GetQueryVar("view");
		if (mapViewStr != null && mapViewStr.length) {
			let mapView = ParseMapView(mapViewStr);

			//Log("Loading map-view:" + ToJSON(mapView));
			result.push(new ACTMapViewMerge({mapID, mapView}).VSet({fromURL: true}));
		}
	}

	if (url.GetQueryVar("timeline")) {
		result.push(new ACTMap_PlayingTimelineSet({mapID, timelineID: parseInt(url.GetQueryVar("timeline"))}));
	}
	if (url.GetQueryVar("step")) {
		result.push(new ACTMap_PlayingTimelineStepSet({mapID, step: parseInt(url.GetQueryVar("step")) - 1}));
	}
	if (url.GetQueryVar("appliedStep")) {
		result.push(new ACTMap_PlayingTimelineAppliedStepSet({mapID, step: parseInt(url.GetQueryVar("appliedStep")) - 1}));
	}

	return result;
}

// maybe temp; easier than using the "fromURL" prop, since AddressBarWrapper class currently doesn't have access to the triggering action itself
export var loadingURL = false;
export async function LoadURL(urlStr: string) {
	MaybeLog(a=>a.urlLoads, ()=>"Loading url: " + urlStr);
	loadingURL = true;

	//if (!GetPath(GetUrlPath(url)).startsWith("global/map")) return;
	let url = NormalizeURL(VURL.Parse(urlStr));

	let syncActions = GetSyncLoadActionsForURL(url, true);
	for (let action of syncActions) {
		store.dispatch(action);
	}

	let loadingMapView = syncActions.Any(a=>a.Is(ACTMapViewMerge));
	if (loadingMapView) {
		let mapUI = FindReact($(".MapUI")[0]) as MapUI;
		if (mapUI) {
			mapUI.LoadScroll();
		}
	}

	// If user followed search-result link (eg. "debatemap.live/global/156"), we only know the node-id.
	// Search for the shortest path from the map's root to this node, and update the view and url to that path.
	//if (url.pathNodes[0] == "global" && url.pathNodes[1] != null && url.pathNodes[1].match(/^[0-9]+$/) && !isBot) {
	let match = url.toString({domain: false}).match(/^\/global\/map\/[a-z-]*\.?([0-9]+)$/);
	if (match && !isBot) {
		let nodeID = parseInt(match[1]);
		let node = await GetAsync(()=>GetNodeL2(nodeID));
		if (node) {
			let shortestPathToNode = await GetAsync(()=>GetShortestPathFromRootToNode(1, node));
			if (shortestPathToNode) {
				let mapViewForPath = CreateMapViewForPath(shortestPathToNode);
				//Log(`Found shortest path (${shortestPathToNode}), so merging: ` + ToJSON(mapViewForPath));
				store.dispatch(new ACTMapViewMerge({mapID: 1, mapView: mapViewForPath}));
			} else {
				store.dispatch(new ACTNotificationMessageAdd(new NotificationMessage(
					`Could not find a path to the node specified in the url (#${nodeID}, title: "${GetNodeDisplayText(node)}").`)));
			}
		} else {
			store.dispatch(new ACTNotificationMessageAdd(new NotificationMessage(`The node specified in the url (#${nodeID}) was not found.`)));
		}

		/*let newURL = url.Clone();
		//newURL.pathNodes.RemoveAt(2);
		store.dispatch(replace(newURL.toString({domain: false})));*/
	}

	loadingURL = false;
}

// saving
// ==========

//g.justChangedURLFromCode = false;
export function GetNewURL(includeMapViewStr = true) {
	//let newURL = URL.Current();
	/*let oldURL = URL.Current(true);
	let newURL = new VURL(oldURL.domain, oldURL.pathNodes);*/

	let newURL = new VURL();
	let page = GetPage();
	newURL.pathNodes.push(page);

	var subpage = GetSubpage();
	if (page in pagesWithSimpleSubpages) {
		newURL.pathNodes.push(subpage);
	}

	if (page == "forum") {
		let subforumID = GetSelectedSubforumID();
		let threadID = GetSelectedThreadID();
		if (subforumID) newURL.pathNodes.push(subforumID+"");
		else if (threadID) newURL.pathNodes.push("*");

		if (threadID) newURL.pathNodes.push(threadID+"");
	}

	if (page == "feedback") {
		let proposalID = GetSelectedProposalID();
		if (proposalID) newURL.pathNodes.push(proposalID+"");
	}

	if (page == "database") {
		if (subpage == "terms" && State(a=>a.main.database.selectedTermID)) {
			newURL.pathNodes.push(State(a=>a.main.database.selectedTermID)+"");
		} else if (subpage == "images" && State(a=>a.main.database.selectedImageID)) {
			newURL.pathNodes.push(State(a=>a.main.database.selectedImageID)+"");
		}
	}

	var mapID: number;
	if (page == "personal") {
		mapID = State(a=>a.main.personal.selectedMapID);
		if (mapID) {
			//newURL.pathNodes.push(mapID+"");
			let urlStr = GetCrawlerURLStrForMap(mapID);
			newURL.pathNodes.push(urlStr);
		}
	}
	if (page == "debates") {
		mapID = State(a=>a.main.debates.selectedMapID);
		if (mapID) {
			//newURL.pathNodes.push(mapID+"");
			let urlStr = GetCrawlerURLStrForMap(mapID);
			newURL.pathNodes.push(urlStr);
		}
	}
	if (page == "global" && subpage == "map") {
		mapID = GetOpenMapID();
		if (isBot) {
			let map = GetMap(mapID);
			let rootNodeID = State("main", "mapViews", mapID, "rootNodeID");
			let rootNode = GetNodeL2(rootNodeID);
			if (rootNode) {
				let nodeStr = GetCrawlerURLStrForNode(rootNode);
				if (rootNodeID && rootNodeID != map.rootNode) {
					newURL.pathNodes.push(nodeStr);
				}
			}
		}
	}

	if (mapID && includeMapViewStr) {
		newURL.SetQueryVar("view", GetMapViewStr(mapID));
	}

	let playingTimeline = mapID && State("main", "maps", mapID, "playingTimeline");
	if (playingTimeline) {
		newURL.SetQueryVar("timeline", playingTimeline);

		let playingTimeline_step = mapID ? State("main", "maps", mapID, "playingTimeline_step") : null;
		if (playingTimeline_step != null) {
			newURL.SetQueryVar("step", playingTimeline_step + 1);
		}

		let playingTimeline_appliedStep = mapID ? State("main", "maps", mapID, "playingTimeline_appliedStep") : null;
		if (playingTimeline_appliedStep != null) {
			newURL.SetQueryVar("appliedStep", playingTimeline_appliedStep + 1);
		}
	}

	if (State(a=>a.main.urlExtraStr)) {
		newURL.SetQueryVar("extra", State(a=>a.main.urlExtraStr));
	}
	if (!State(a=>a.main.analyticsEnabled) && newURL.GetQueryVar("analytics") == null) {
		newURL.SetQueryVar("analytics", "false");
	}
	if (State(a=>a.main.envOverride)) {
		newURL.SetQueryVar("env", State(a=>a.main.envOverride));
	}
	if (State(a=>a.main.dbVersionOverride)) {
		newURL.SetQueryVar("dbVersion", State(a=>a.main.dbVersionOverride));
	}

	// a default-child is only used (ie. removed from url) if there are no path-nodes after it
	if (subpage && subpage == rootPageDefaultChilds[page] && newURL.pathNodes.length == 2) newURL.pathNodes.length = 1;
	if (page == "home" && newURL.pathNodes.length == 1) newURL.pathNodes.length = 0;

	Assert(!newURL.pathNodes.Any(a=>a == "/"), `A path-node cannot be just "/". @url(${newURL})`);

	return newURL;
}
function GetMapViewStr(mapID: number) {
	let map = GetMap(mapID);
	if (map == null) return "";
	let rootNodeID = map.rootNode;
	let rootNodeViewStr = GetNodeViewStr(mapID, rootNodeID.toString());
	rootNodeViewStr = rootNodeViewStr.TrimEnd("."); // remove .'s to keep shorter and cleaner
	//rootNodeViewStr += "_"; // add "_", so that Facebook doesn't cut off end special-chars
	return rootNodeViewStr;
}
export function GetNodeViewStr(mapID: number, path: string) {
	let nodeView = GetNodeView(mapID, path);
	if (nodeView == null) return "";

	let childrenStr = "";
	for (let childID of (nodeView.children || {}).VKeys(true)) {
		let childNodeViewStr = GetNodeViewStr(mapID, `${path}/${childID}`);
		if (childNodeViewStr.length) {
			childrenStr += (childrenStr.length ? "," : "") + childNodeViewStr;
		}
	}
	for (let childID of (nodeView.subnodes || {}).VKeys(true)) {
		let childNodeViewStr = GetNodeViewStr(mapID, `${path}/L${childID}`);
		if (childNodeViewStr.length) {
			childrenStr += (childrenStr.length ? "," : "") + childNodeViewStr;
		}
	}

	let ownIDStr = path.substr(path.lastIndexOf("/") + 1);
	let ownStr = ownIDStr;
	//if (nodeView.expanded && !childrenStr.length) ownStr += "e";
	//let mapView = GetMapView(mapID);
	if (nodeView.selected) {
		ownStr += "s";

		/*let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
		let nodeBox = $(".NodeUI_Inner").ToList().FirstOrX(a=>(FindReact(a[0]) as NodeUI_Inner).props.path == path);
		let nodeBoxComp = FindReact(nodeBox[0]) as NodeUI_Inner;
		let viewOffset = viewCenter_onScreen.Minus(nodeBox.GetScreenRect().Position).NewX(x=>x.RoundTo(1)).NewY(y=>y.RoundTo(1));
		let offsetStr = viewOffset.toString().replace(" ", "_");
		ownStr += `(${offsetStr})`;*/
	}
	if (nodeView.focused) { // && GetSelectedNodeID(mapID) == null) {
		Assert(nodeView.viewOffset != null);
		let offsetStr = Vector2i.prototype.toString.call(nodeView.viewOffset).replace(" ", "_");
		ownStr += `f(${offsetStr})`;
	}
	if (nodeView.openPanel) {
		ownStr += `p(${nodeView.openPanel})`;
	}
	
	/*let hasData = false;
	if (childrenStr.length) hasData = true;
	else if (nodeView.expanded) hasData = true;*/
	let hasData = ownStr.length > ownIDStr.length || nodeView.expanded;
	if (!hasData) return "";

	let result = ownStr;
	if (nodeView.expanded) {
		let prefix = "";
		if (nodeView.expanded_truth && !nodeView.expanded_relevance) {
			prefix = "t";
		} else if (nodeView.expanded_relevance && !nodeView.expanded_truth) {
			prefix = "r";
		} else {
			// only include e if children-str is empty (if has child-str, then e is implied/not-needed)
			if (childrenStr.length == 0) {
				prefix = "e";
			}
		}

		result += prefix;
		if (childrenStr.length) {
			result += `:${childrenStr}.`;
		}
	}
	return result;
}