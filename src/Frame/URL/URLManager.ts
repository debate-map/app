import {replace} from "react-router-redux";
import {GetSelectedNodeID, GetOpenMapID, GetSelectedNodePath, GetNodeView, GetMapView} from "../../store/Root/Main";
import {GetMap} from "../../store/Root/Firebase";
import {ToInt} from "../General/Types";
import {browserHistory} from "../../store/createStore";
import {History} from "history";
import {Vector2i} from "../General/VectorStructs";
import {FindReact} from "../UI/ReactGlobals";
import NodeUI_Inner from "../../routes/@Shared/Maps/MapNode/NodeUI_Inner";

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
		let offsetStr = viewOffset.toString().replace(" ", ",");
		ownStr += `(${offsetStr})`;
	}
	if (mapView.focusNode == path && GetSelectedNodeID(mapID) == null) {
		let offsetStr = mapView.viewOffset.toString().replace(" ", ",");
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