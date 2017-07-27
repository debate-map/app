import {replace, push} from "redux-little-router";
import {ToInt} from "../General/Types";
import {Vector2i} from "../General/VectorStructs";
import {FindReact, ShallowChanged} from "../UI/ReactGlobals";
import NodeUI_Inner from "../../UI/@Shared/Maps/MapNode/NodeUI_Inner";
import {GetOpenMapID, ACTSetPage, ACTSetSubpage, ACTNotificationMessageAdd} from "../../Store/main";
import {GetMap} from "../../Store/firebase/maps";
import {GetNodeView, GetMapView, GetSelectedNodeID, GetViewOffset, GetFocusedNodeID} from "../../Store/main/mapViews";
import {MapView, MapNodeView} from "../../Store/main/mapViews/@MapViews";
import {ACTMapViewMerge} from "../../Store/main/mapViews/$mapView";
import {URL, QueryVar, rootPageDefaultChilds} from "../General/URLs";
import {ACTTermSelect, ACTImageSelect} from "../../Store/main/content";
import { GetNodeDisplayText } from "../../Store/firebase/nodes/$node";
import { GetNodeAsync, GetNode } from "Store/firebase/nodes";
import { GetShortestPathFromRootToNode } from "Frame/Store/PathFinder";
import {CreateMapViewForPath} from "../Store/PathFinder";
import NotificationMessage from "../../Store/main/@NotificationMessage";
import { ACTDebateMapSelect } from "../../Store/main/debates";
import { ACTSet } from "Store";
import MapUI from "../../UI/@Shared/Maps/MapUI";
import {MapNode} from "../../Store/firebase/nodes/@MapNode";

export function GetCrawlerURLStrForNode(node: MapNode) {
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
	let onMapPage = result.Normalized().toString({domain: false}).startsWith("/global/map");
	if (mapID && onMapPage) {
		let nodeID = GetFocusedNodeID(mapID);
		let node = nodeID ? GetNode(nodeID) : null;
		//if (result.pathNodes.length == 1) {
		/*if (result.Normalized().toString({domain: false}).startsWith("/global/map") && result.pathNodes.length == 1) {
			result.pathNodes.push("map");
		}*/
		if (node) {
			result = result.Normalized();
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
	let nodeView = {} as MapNodeView;

	let ownStr = viewStr.Contains(":") ? viewStr.substr(0, viewStr.indexOf(":")) : viewStr;
	let childrenStr = viewStr.Contains(":") ? viewStr.slice(viewStr.indexOf(":") + 1, -1) : "";

	let nodeID = parseInt(ownStr.match(/^[0-9]+/)[0]);

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

	if (ownStr_withoutParentheses.Contains("e"))
		nodeView.expanded = true;
	else if (childrenStr && childrenStr.length) {
		nodeView.expanded = true;
		nodeView.children = {};

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
			nodeView.children[childID] = childNodeView;
		}
	}

	return [nodeID, nodeView];
}

const pagesWithSimpleSubpages = ["home", "more", "content", "global"].ToMap(page=>page, ()=>null);
export function GetSyncLoadActionsForURL(url: URL, directURLChange: boolean) {
	let result = [];

	let page = url.pathNodes[0];
	result.push(new ACTSetPage(page).VSet({fromURL: true}));
	let subpage = url.pathNodes[1];
	if (url.pathNodes[1] && page in pagesWithSimpleSubpages) {
		result.push(new ACTSetSubpage({page, subpage}).VSet({fromURL: true}));
	}

	if (page == "content") {
		if (subpage == "terms" && url.pathNodes[2]) {
			result.push(new ACTTermSelect({id: url.pathNodes[2].ToInt()}).VSet({fromURL: true}));
		} else if (subpage == "images" && url.pathNodes[2]) {
			result.push(new ACTImageSelect({id: url.pathNodes[2].ToInt()}).VSet({fromURL: true}));
		}
	}

	if (url.Normalized().toString({domain: false}).startsWith("/global/map")) {
		if (isBot) {
			// example: /global/map/some-node.123
			let lastPathNode = url.pathNodes.LastOrX();
			let crawlerURLMatch = lastPathNode && lastPathNode.match(/\.([0-9]+)$/);
			if (isBot) {
				if (crawlerURLMatch) {
					let nodeID = parseInt(crawlerURLMatch[1]);
					result.push(new ACTSet({path: `main/mapViews/${1}/rootNodeID`, value: nodeID}));
				} else if (directURLChange) {
					result.push(new ACTSet({path: `main/mapViews/${1}/rootNodeID`, value: null}));
				}
			}
		} else {
			// example: /global?view=1:3:100:101f(384_111):102:.104:.....
			let mapViewStr = url.GetQueryVar("view");
			if (mapViewStr != null && mapViewStr.length) {
				let mapView = ParseMapView(mapViewStr);

				//Log("Loading map-view:" + ToJSON(mapView));
				result.push(new ACTMapViewMerge({mapID: 1, mapView}).VSet({fromURL: true}));
			}
		}
	}

	if (url.pathNodes[0] == "debates") { //&& IsNumberString(url.pathNodes[1])) {
		result.push(new ACTDebateMapSelect({id: url.pathNodes[1] ? url.pathNodes[1].ToInt() : null}).VSet({fromURL: true}))
	}

	return result;
}

// maybe temp; easier than using the "fromURL" prop, since AddressBarWrapper class currently doesn't have access to the triggering action itself
export var loadingURL = false;
export async function LoadURL(urlStr: string) {
	MaybeLog(a=>a.urlLoads, ()=>"Loading url: " + urlStr);
	loadingURL = true;

	//if (!GetPath(GetUrlPath(url)).startsWith("global/map")) return;
	let url = URL.Parse(urlStr).Normalized();

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
	let match = url.toString({domain: false}).match(/^\/global\/map\/[a-z-]*\.([0-9]+)$/);
	if (match && !isBot) {
		let nodeID = parseInt(match[1]);
		let node = await GetNodeAsync(nodeID);
		if (node) {
			let shortestPathToNode = await GetShortestPathFromRootToNode(1, node);
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

		let newURL = url.Clone();
		newURL.pathNodes.RemoveAt(1);
		store.dispatch(replace(newURL.toString({domain: false})));
	}

	loadingURL = false;
}

// saving
// ==========

g.justChangedURLFromCode = false;
export function GetNewURL(includeMapViewStr = true) {
	//let newURL = URL.Current();
	/*let oldURL = URL.Current(true);
	let newURL = new URL(oldURL.domain, oldURL.pathNodes);*/

	let newURL = new URL();
	let page = State(a=>a.main.page) || "home";
	newURL.pathNodes.push(page);

	var subpage = (State("main", page, "subpage") as string) || rootPageDefaultChilds[page];
	if (page in pagesWithSimpleSubpages) {
		newURL.pathNodes.push(subpage);
	}

	if (page == "content") {
		if (subpage == "terms" && State(a=>a.main.content.selectedTermID)) {
			newURL.pathNodes.push(State(a=>a.main.content.selectedTermID)+"");
		} else if (subpage == "images" && State(a=>a.main.content.selectedImageID)) {
			newURL.pathNodes.push(State(a=>a.main.content.selectedImageID)+"");
		}
	}

	if (page == "debates") {
		let mapID = State(a=>a.main.debates.selectedDebateMapID);
		if (mapID) {
			newURL.pathNodes.push(mapID+"");
		}
	}

	// break point
	if (page == "global" && subpage == "map") {
		if (isBot) {
			let mapID = GetOpenMapID();
			let map = GetMap(mapID);
			let rootNodeID = State("main", "mapViews", mapID, "rootNodeID");
			let rootNode = GetNode(rootNodeID);
			if (rootNode) {
				let nodeStr = GetCrawlerURLStrForNode(rootNode);
				if (rootNodeID && rootNodeID != map.rootNode) {
					newURL.pathNodes.push(nodeStr);
				}
			}
		} else {
			if (includeMapViewStr) {
				let mapID = GetOpenMapID();
				newURL.queryVars.push(new QueryVar("view", GetMapViewStr(mapID)));
			}
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
function GetNodeViewStr(mapID: number, path: string) {
	let nodeView = GetNodeView(mapID, path);
	if (nodeView == null) return "";

	let childrenStr = "";
	for (let childID of (nodeView.children || {}).VKeys(true)) {
		let childNodeViewStr = GetNodeViewStr(mapID, `${path}/${childID}`);
		if (childNodeViewStr.length)
			childrenStr += (childrenStr.length ? "," : "") + childNodeViewStr;
	}

	/*let ownID = path.split("/").map(ToInt).Last();
	let ownStr = ownID.toString();*/
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
		if (childrenStr.length)
			result += `:${childrenStr}.`;
		else
			result += "e";
	}
	return result;
}