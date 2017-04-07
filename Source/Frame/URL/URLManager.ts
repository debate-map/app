import {Log} from "../General/Logging";
import {Assert} from "../General/Assert";
import {replace} from "react-router-redux";
import {ToInt} from "../General/Types";
import {History} from "history";
import {Vector2i} from "../General/VectorStructs";
import {FindReact} from "../UI/ReactGlobals";
import NodeUI_Inner from "../../UI/@Shared/Maps/MapNode/NodeUI_Inner";
import {GetOpenMapID} from "../../Store/main";
import {GetMap} from "../../Store/firebase/maps";
import {GetNodeView, GetMapView, GetSelectedNodeID, GetFocusNode, GetViewOffset} from "../../Store/main/mapViews";
import {MapView, MapNodeView} from "../../Store/main/mapViews/@MapViews";
import {FromJSON, ToJSON} from "../General/Globals";
import {ACTMapViewMerge} from "../../Store/main/mapViews/$mapView";
import {GetPathNodes, GetPath} from "../../Store/router";
import {URL, QueryVar, GetUrlVars} from "../General/URLs";

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

export function LoadURL() {
	if (!GetPath().startsWith("global/map")) return;
	let urlVars = GetUrlVars();
	// example: /global?view=1:3:100:101f(384_111):102:.104:.....
	let mapViewStr = urlVars.view;
	if (mapViewStr == null || mapViewStr.length == 0) return;
	let mapView = ParseMapView(mapViewStr);

	//Log("Loading map-view:" + ToJSON(mapView));
	store.dispatch(new ACTMapViewMerge({mapView}));
}

// saving
// ==========

export function UpdateURL() {
	//let newURL = URL.Current();
	let oldURL = URL.Current();
	let newURL = new URL(oldURL.domain, oldURL.pathNodes);
	if (GetPath().startsWith("global/map"))
		newURL = CreateURL_Globals();
	if (!State().main.analyticsEnabled && newURL.GetQueryVar("analytics") == null)
		newURL.SetQueryVar("analytics", "false");
	if (State().main.envOverride)
		newURL.SetQueryVar("env", State().main.envOverride);
	store.dispatch(replace(newURL.toString(false)));
}
function CreateURL_Globals(): URL {
	//let result = URL.Current().Clone();
	let result = new URL(URL.Current().domain);
	result.pathNodes = ["global"];
	let mapID = GetOpenMapID();
	result.queryVars.push(new QueryVar("view", GetMapViewStr(mapID)));
	return result;
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
	for (let {name: childID} of (nodeView.children || {}).Props) {
		let childNodeViewStr = GetNodeViewStr(mapID, `${path}/${childID}`);
		if (childNodeViewStr.length)
			childrenStr += (childrenStr.length ? "," : "") + childNodeViewStr;
	}

	let ownID = path.split("/").map(ToInt).Last();
	let ownStr = ownID.toString();
	//if (nodeView.expanded && !childrenStr.length) ownStr += "e";
	let mapView = GetMapView(mapID);
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
	let hasData = ownStr.length > ownID.toString().length || nodeView.expanded;
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