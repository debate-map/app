import {Log} from "../General/Logging";
import {Assert} from "../General/Assert";
import {replace, push} from "react-router-redux";
import {ToInt} from "../General/Types";
import {History} from "history";
import {Vector2i} from "../General/VectorStructs";
import {FindReact, ShallowChanged} from "../UI/ReactGlobals";
import NodeUI_Inner from "../../UI/@Shared/Maps/MapNode/NodeUI_Inner";
import {GetOpenMapID, ACTSetPage, ACTSetSubpage, ACTNotificationMessageAdd} from "../../Store/main";
import {GetMap} from "../../Store/firebase/maps";
import {GetNodeView, GetMapView, GetSelectedNodeID, GetFocusNode, GetViewOffset} from "../../Store/main/mapViews";
import {MapView, MapNodeView} from "../../Store/main/mapViews/@MapViews";
import {FromJSON, ToJSON} from "../General/Globals";
import {ACTMapViewMerge} from "../../Store/main/mapViews/$mapView";
import {URL, QueryVar, rootPageDefaultChilds} from "../General/URLs";
import {ACTTermSelect, ACTImageSelect} from "../../Store/main/content";
import { GetNodeDisplayText } from "../../Store/firebase/nodes/$node";
import { GetNodeAsync } from "Store/firebase/nodes";
import { GetShortestPathFromRootToNode } from "Frame/Store/PathFinder";
import {CreateMapViewForPath} from "../Store/PathFinder";
import NotificationMessage from "../../Store/main/@NotificationMessage";
import {ACTDebateMapSelect} from "../../Store/main/debates";

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
		result.focus = true;

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
		nodeView.focus = true;
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
			nodeView.children[childID] = childNodeView;
		}
	}

	return [nodeID, nodeView];
}

const pagesWithSimpleSubpages = ["home", "more", "content", "global"].ToMap(page=>page, ()=>null);
export async function LoadURL(urlStr: string) {
	//if (!GetPath(GetUrlPath(url)).startsWith("global/map")) return;
	let url = URL.Parse(urlStr).WithImpliedPathNodes();

	let page = url.pathNodes[0];
	store.dispatch(new ACTSetPage(page).VSet({fromURL: true}));
	let subpage = url.pathNodes[1];
	if (url.pathNodes[1] && page in pagesWithSimpleSubpages) {
		store.dispatch(new ACTSetSubpage({page, subpage}).VSet({fromURL: true}));
	}

	if (page == "content") {
		if (subpage == "terms" && url.pathNodes[2]) {
			store.dispatch(new ACTTermSelect({id: url.pathNodes[2].ToInt()}).VSet({fromURL: true}));
		} else if (subpage == "images" && url.pathNodes[2]) {
			store.dispatch(new ACTImageSelect({id: url.pathNodes[2].ToInt()}).VSet({fromURL: true}));
		}
	}

	if (url.WithImpliedPathNodes().toString({domain: false}).startsWith("/global/map")) {
		// example: /global?view=1:3:100:101f(384_111):102:.104:.....
		let mapViewStr = url.GetQueryVar("view");
		if (mapViewStr == null || mapViewStr.length == 0) return;
		let mapView = ParseMapView(mapViewStr);

		//Log("Loading map-view:" + ToJSON(mapView));
		store.dispatch(new ACTMapViewMerge({mapID: 1, mapView}).VSet({fromURL: true}));
	}

	// If user followed search-result link (eg. "debatemap.live/global/156"), we only know the node-id.
	// Search for the shortest path from the map's root to this node, and update the view and url to that path.
	//if (url.pathNodes[0] == "global" && url.pathNodes[1] != null && url.pathNodes[1].match(/^[0-9]+$/) && !isBot) {
	let match = url.toString({domain: false}).match(/^\/global\/[a-z-]*\.([0-9]+)$/);
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

	if (url.pathNodes[0] == "debates") { //&& IsNumberString(url.pathNodes[1])) {
		store.dispatch(new ACTDebateMapSelect({id: url.pathNodes[1] ? url.pathNodes[1].ToInt() : null}).VSet({fromURL: true}))
	}
}

// saving
// ==========

export function UpdateURL(pushNewURL: boolean) {
	//let newURL = URL.Current();
	/*let oldURL = URL.Current(true);
	let newURL = new URL(oldURL.domain, oldURL.pathNodes);*/

	let newURL = new URL();
	let page = State(a=>a.main.page) || "home";
	newURL.pathNodes.push(page);

	var subpage = (State(`main/${page}/subpage`) as string) || rootPageDefaultChilds[page];
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

	if (page == "global" && subpage == "map" && !isBot) {
		let mapID = GetOpenMapID();
		newURL.queryVars.push(new QueryVar("view", GetMapViewStr(mapID)));
	}

	if (!State(a=>a.main.analyticsEnabled) && newURL.GetQueryVar("analytics") == null) {
		newURL.SetQueryVar("analytics", "false");
	}
	if (State(a=>a.main.envOverride)) {
		newURL.SetQueryVar("env", State(a=>a.main.envOverride));
	}

	// a default-child is only used (ie. removed from url) if there are no path-nodes after it
	if (subpage && subpage == rootPageDefaultChilds[page] && newURL.pathNodes.length == 2) newURL.pathNodes.length = 1;
	if (page == "home" && newURL.pathNodes.length == 1) newURL.pathNodes.length = 0;

	//let newURLStr = newURL.toString({domain: false});
	let newURLState = newURL.ToState();
	if (ShallowChanged(newURLState.Excluding("key"), (State(a=>a.router.location) || {}).Excluding("key"))) {
		store.dispatch(pushNewURL ? push(newURLState) : replace(newURLState));
	}
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
	if (nodeView.focus) { // && GetSelectedNodeID(mapID) == null) {
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