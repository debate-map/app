import {replace} from "react-router-redux";
import {GetSelectedNodeID, GetOpenMapID, GetSelectedNodePath, GetNodeView} from "../../store/Root/Main";
import {GetMap} from "../../store/Root/Firebase";
import {ToInt} from "../General/Types";
import {browserHistory} from "../../store/createStore";
import {History} from "history";

export function UpdateURL_Globals() {
	let newURL = CreateURL_Globals();
	store.dispatch(replace(newURL))
}
function CreateURL_Globals() {
	let pathStr = "/global/";
	let mapID = GetOpenMapID();
	let selectedNodeID = GetSelectedNodeID(mapID);
	if (selectedNodeID)
		pathStr += selectedNodeID;

	let viewStr = GetMapViewStr(mapID);
	let searchStr = `?view=${viewStr}`;
	
	/*store.dispatch(replace({
		pathname: pathStr,
		search: searchStr,
	}));*/
	//(browserHistory as History).replace({pathname: pathStr, search: searchStr});
	return `${pathStr}${searchStr}`;
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
	
	/*let hasData = false;
	if (childrenStr.length) hasData = true;
	else if (nodeView.expanded) hasData = true;*/
	let hasData = nodeView.expanded;
	if (!hasData) return "";

	let result = ownStr;
	if (nodeView.expanded)
		result += `,${childrenStr}.`;
	return result;
}