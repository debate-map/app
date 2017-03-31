import {replace} from "react-router-redux";
import {ToInt} from "../General/Types";
import {History} from "history";
import {Vector2i} from "../General/VectorStructs";
import {FindReact} from "../UI/ReactGlobals";
import NodeUI_Inner from "../../UI/@Shared/Maps/MapNode/NodeUI_Inner";
import {GetOpenMapID} from "../../Store/main";
import {GetMap} from "../../Store/firebase/maps";
import {GetNodeView, GetMapView, GetSelectedNodeID, GetFocusNode, GetViewOffset} from "../../Store/main/mapViews";
import {GetUrlVars} from "../General/Globals_Free";
import {MapView, MapNodeView} from "../../Store/main/mapViews/@MapViews";

// loading
// ==========

function ParseMapView(viewStr: string) {
	let result = {} as MapView;

	let [rootNodeIDStr, rootNodeViewStr] = viewStr.SplitAt(1);
	let rootNodeView = ParseNodeView(rootNodeViewStr);
	result.rootNodeViews = {[rootNodeIDStr]: rootNodeView};
	return result;
}
function ParseNodeView(viewStr: string) {
	let result = {} as MapNodeView;

	let ownStr = viewStr.contains(",") ? viewStr.substr(0, viewStr.indexOf(",")) : viewStr;
	let childrenStr = viewStr.contains(",") ? viewStr.slice(viewStr.indexOf(",") + 1, -1) : "";

	//if (ownStr.)
	// todo: do something

	return result;
}

export function LoadURL_Globals() {
	let search = State().router.location.search;
	let urlVars = GetUrlVars(search);
	// example: /global?view=1,3,100,101f(384,111),102,.104,.....
	let viewStr = urlVars.view || "";

	
}

// saving
// ==========

export function UpdateURL_Globals() {
	let newURL = CreateURL_Globals();
	store.dispatch(replace(newURL))
}
function CreateURL_Globals() {
	let pathStr = "/global";
	let mapID = GetOpenMapID();
	/*let selectedNodeID = GetSelectedNodeID(mapID);
	if (selectedNodeID)
		pathStr += selectedNodeID;*/

	let searchProps = {} as any;
	searchProps.view = GetMapViewStr(mapID);
	/*let mapView = GetMapView(mapID);
	if (mapView) {
		searchProps.focus = mapView.focusNode;
		searchProps.offset = mapView.viewOffset.toString().replace(" ", ",");
	}*/

	return `${pathStr}?${searchProps.Props.map(a=>a.name + "=" + a.value).join("&")}`;
}
function GetMapViewStr(mapID: number) {
	let map = GetMap(mapID);
	if (map == null) return "";
	let rootNodeID = map.rootNode;
	let rootNodeViewStr = GetNodeViewStr(mapID, rootNodeID.toString());
	return rootNodeViewStr;
}
function GetNodeViewStr(mapID: number, path: string) {
	let nodeView = GetNodeView(mapID, path);
	if (nodeView == null) return "";

	let childrenStr = "";
	for (let {name: childID} of (nodeView.children || {}).Props) {
		let childNodeViewStr = GetNodeViewStr(mapID, `${path}/${childID}`);
		childrenStr += childNodeViewStr;
	}

	let ownID = path.split("/").map(ToInt).Last();
	let ownStr = ownID.toString();
	//if (nodeView.expanded && !childrenStr.length) ownStr += "e";
	let mapView = GetMapView(mapID);
	if (nodeView.selected) {
		ownStr += "s";

		let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
		let nodeBox = $(".NodeUI_Inner").ToList().FirstOrX(a=>(FindReact(a[0]) as NodeUI_Inner).props.path == path);
		let nodeBoxComp = FindReact(nodeBox[0]) as NodeUI_Inner;
		let viewOffset = viewCenter_onScreen.Minus(nodeBox.GetScreenRect().Position).NewX(x=>x.RoundTo(1)).NewY(y=>y.RoundTo(1));
		let offsetStr = viewOffset.toString().replace(" ", "_");
		ownStr += `(${offsetStr})`;
	}
	if (nodeView.focus && GetSelectedNodeID(mapID) == null) {
		let offsetStr = nodeView.viewOffset.toString().replace(" ", ",");
		ownStr += `f(${offsetStr})`;
	}
	
	/*let hasData = false;
	if (childrenStr.length) hasData = true;
	else if (nodeView.expanded) hasData = true;*/
	let hasData = ownStr.length > ownID.toString().length || nodeView.expanded;
	if (!hasData) return "";

	let result = ownStr;
	if (nodeView.expanded)
		result += `,${childrenStr}.`;
	return result;
}