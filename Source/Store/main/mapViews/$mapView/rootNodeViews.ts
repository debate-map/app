import {MapNodeView} from "../@MapViews";
import Action from "../../../../Frame/General/Action";
import {ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedSet, ACTViewCenterChange} from "../../mapViews";
import {GetTreeNodesInObjTree} from "../../../../Frame/V/V";
import u from "updeep";
import {RootNodeViews} from "./rootNodeViews/@RootNodeViews";
import {GetViewOffsetForNodeBox, GetNodeBoxForPath} from "../../../../UI/@Shared/Maps/MapUI";

export function RootNodeViewsReducer(state = new RootNodeViews(), action: Action<any>) {
	if (action.Is(ACTMapNodeSelect)) {
		let result = state;
		let nodes = GetTreeNodesInObjTree(state, true);

		let selectedNode = nodes.FirstOrX(a=>a.Value && a.Value.selected);
		if (selectedNode)
			result = u.updateIn(selectedNode.PathStr_Updeep, u.omit(["selected", "openPanel"]), result);
		let focusNode = nodes.FirstOrX(a=>a.Value && a.Value.focus);
		if (focusNode)
			result = u.updateIn(focusNode.PathStr_Updeep, u.omit(["focus", "viewOffset"]), result);
		if (action.payload.path == null)
			return result;
		
		let targetNodePath = action.payload.path.split("/").join(".children.");
		let nodeBox = GetNodeBoxForPath(action.payload.path);
		let viewOffset = GetViewOffsetForNodeBox(nodeBox);
		result = u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, selected: true, focus: true, viewOffset}), result);
		return result;
	}
	if (action.Is(ACTMapNodePanelOpen)) {
		let targetNodePath = action.payload.path.split("/").join(".children.");
		return u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, openPanel: action.payload.panel}), state);
	}
	if (action.Is(ACTMapNodeExpandedSet)) {
		let targetNodePath = action.payload.path.split("/").join(".children.");
		return u.updateIn(targetNodePath, (old = new MapNodeView())=> {
			let result = {...old, expanded: !old.expanded};
			if (action.payload.recursive) {
				let expandedNodes = GetTreeNodesInObjTree(result).Where(a=>a.Value.expanded);
				for (let treeNode of expandedNodes) {
					result = u.updateIn(treeNode.PathStr_Updeep + ".expanded", false, result);
				}
			}
			return result;
		}, state);
	}
	if (action.Is(ACTViewCenterChange)) {
		//return {...state, focusNode: action.payload.focusNode, viewOffset: action.payload.viewOffset};
		
		let nodes = GetTreeNodesInObjTree(state, true);
		let focusNode = nodes.FirstOrX(a=>a.Value && a.Value.focus);
		let result = state;
		if (focusNode)
			result = u.updateIn(focusNode.PathStr_Updeep, u.omit(["focus", "viewOffset"]), result);
		
		let targetNodePath = action.payload.focusNode.split("/").join(".children.");
		result = u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, focus: true, viewOffset: action.payload.viewOffset}), result);
		return result;
	}
	return state;
}