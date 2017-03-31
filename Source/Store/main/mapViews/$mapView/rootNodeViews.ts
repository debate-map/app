import {MapNodeView} from "../@MapViews";
import Action from "../../../../Frame/General/Action";
import {ACTMapNodeSelect, ACTMapNodePanelOpen, ACTMapNodeExpandedToggle, ACTViewCenterChange} from "../../mapViews";
import {GetTreeNodesInObjTree} from "../../../../Frame/V/V";
import u from "updeep";
import {RootNodeViews} from "./rootNodeViews/@RootNodeViews";

export function RootNodeViewsReducer(state = new RootNodeViews(), action: Action<any>) {
	if (action.Is(ACTMapNodeSelect)) {
		let nodes = GetTreeNodesInObjTree(state, true);
		let selectedNode = nodes.FirstOrX(a=>a.Value && a.Value.selected);
		let result = state;
		/*if (selectedNode)
			result = u.updateIn(selectedNode.PathStr_Updeep + ".selected", false, result);
		if (selectedNode)
			result = u.updateIn(selectedNode.PathStr_Updeep + ".openPanel", null, result);*/
		if (selectedNode)
			result = u.updateIn(selectedNode.PathStr_Updeep, u.omit(["selected", "openPanel"]), result);
		if (action.payload.path == null)
			return result;

		/*let nodeToSelect_finalPath = action.payload.path.split("/").join("/children/").split("/");
		Assert(GetTreeNodesInPath(newRootNodeViews, nodeToSelect_finalPath.concat(["selected"])).Last().Value !== true,
			"Cannot dispatch select-node action for a node that's already selected.");*/
		//let rootNodeView_withSelect = CloneTreeDownToXWhileReplacingXValue(rootNodeView_withDeselect, nodeToSelect_finalPath + "/selected", true);
		/*let rootNodeView_withSelect = VisitTreeNodesInPath({...rootNodeView_withDeselect}, nodeToSelect_finalPath, node=> {
			node.Value = {...node.Value};
			if (node.PathNodes.length == nodeToSelect_finalPath.length) {
				node.Value.selected = true;
				node.Value.focus = true;
			}
		});*/

		//let targetNodePath = action.payload.path.split("/").Skip(1).map(key=>["children", key]).join(".");
		let targetNodePath = action.payload.path.split("/").join(".children.");
		result = u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, selected: true, focus: true}), result);
		return result;
	}
	if (action.Is(ACTMapNodePanelOpen)) {
		/*let nodeToSelect_finalPath = action.payload.path.split("/").Skip(1).SelectMany(key=>["children", key]);
		let rootNodeView_withOpenPanel = VisitTreeNodesInPath({...state.rootNodeView}, nodeToSelect_finalPath.concat(["openPanel"]), node=> {
			node.Value =
				IsNumberString(node.prop) ? {...node.Value || {children: {}}} :
				node.prop == "children" ? {...node.Value || {}} :
				(Assert(node.prop == "openPanel"), action.payload.panel);
		});*/

		let targetNodePath = action.payload.path.split("/").join(".children.");
		return u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, openPanel: action.payload.panel}), state);
	}
	if (action.Is(ACTMapNodeExpandedToggle)) {
		let targetNodePath = action.payload.path.split("/").join(".children.");
		return u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, expanded: !old.expanded}), state);
	}
	if (action.Is(ACTViewCenterChange)) {
		//return {...state, focusNode: action.payload.focusNode, viewOffset: action.payload.viewOffset};
		
		let nodes = GetTreeNodesInObjTree(state, true);
		let focusNode = nodes.FirstOrX(a=>a.Value && a.Value.focus);
		let result = state;
		if (focusNode)
			result = u.updateIn(focusNode.PathStr_Updeep, u.omit(["focus", "viewOffset"]), result);

		/*let nodeToSelect_finalPath = action.payload.path.split("/").join("/children/").split("/");
		Assert(GetTreeNodesInPath(newRootNodeViews, nodeToSelect_finalPath.concat(["selected"])).Last().Value !== true,
			"Cannot dispatch select-node action for a node that's already selected.");*/
		//let rootNodeView_withSelect = CloneTreeDownToXWhileReplacingXValue(rootNodeView_withDeselect, nodeToSelect_finalPath + "/selected", true);
		/*let rootNodeView_withSelect = VisitTreeNodesInPath({...rootNodeView_withDeselect}, nodeToSelect_finalPath, node=> {
			node.Value = {...node.Value};
			if (node.PathNodes.length == nodeToSelect_finalPath.length) {
				node.Value.selected = true;
				node.Value.focus = true;
			}
		});*/
		
		let targetNodePath = action.payload.focusNode.split("/").join(".children.");
		result = u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, focus: true, viewOffset: action.payload.viewOffset}), result);
		return result;
	}
	return state;
}