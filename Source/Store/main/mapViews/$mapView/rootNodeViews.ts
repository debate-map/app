import {MapNodeView, MapView} from "../@MapViews";
import Action from "../../../../Frame/General/Action";
import {GetTreeNodesInObjTree} from "../../../../Frame/V/V";
import * as u from "updeep";
import {RootNodeViews} from "./rootNodeViews/@RootNodeViews";
import {GetViewOffsetForNodeBox, GetNodeBoxForPath} from "../../../../UI/@Shared/Maps/MapUI";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {GetPathNodes} from "../../mapViews";

export class ACTMapNodeSelect extends Action<{mapID: number, path: string}> {}
export class ACTMapNodePanelOpen extends Action<{mapID: number, path: string, panel: string}> {}
export class ACTMapNodeExpandedSet extends Action<{mapID: number, path: string, expanded: boolean, recursive: boolean}> {}
export class ACTMapNodeChildLimitSet extends Action<{mapID: number, path: string, direction: "down" | "up", value: number}> {}
export class ACTViewCenterChange extends Action<{mapID: number, focusNodePath: string, viewOffset: Vector2i}> {}

export function RootNodeViewsReducer(state = new RootNodeViews(), action: Action<any>, mapID: number) {
	if (action.Is(ACTMapNodeSelect) && action.payload.mapID == mapID) {
		let result = state;
		let nodes = GetTreeNodesInObjTree(state, true);

		let selectedNode = nodes.FirstOrX(a=>a.Value && a.Value.selected);
		if (selectedNode)
			result = u.updateIn(selectedNode.PathStr_Updeep, u.omit(["selected", "openPanel"]), result);
		/*let focusNode = nodes.FirstOrX(a=>a.Value && a.Value.focused);
		if (focusNode)
			result = u.updateIn(focusNode.PathStr_Updeep, u.omit(["focused", "viewOffset"]), result);*/
		if (action.payload.path == null)
			return result;
		
		let targetNodePath = GetPathNodes(action.payload.path).join(".children.");
		/*let nodeBox = GetNodeBoxForPath(action.payload.path);
		let viewOffset = GetViewOffsetForNodeBox(nodeBox);
		result = u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, selected: true, focused: true, viewOffset}), result);*/
		result = u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, selected: true}), result);
		return result;
	}
	if (action.Is(ACTMapNodePanelOpen) && action.payload.mapID == mapID) {
		let targetNodePath = GetPathNodes(action.payload.path).join(".children.");
		return u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, openPanel: action.payload.panel}), state);
	}
	if (action.Is(ACTMapNodeExpandedSet) && action.payload.mapID == mapID) {
		let targetNodePath = GetPathNodes(action.payload.path).join(".children.");
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
	if (action.Is(ACTMapNodeChildLimitSet) && action.payload.mapID == mapID) {
		let targetNodePath = GetPathNodes(action.payload.path).join(".children.");
		return u.updateIn(targetNodePath, (old = new MapNodeView())=> {
			return {...old, [`childLimit_${action.payload.direction}`]: action.payload.value};
		}, state);
	}
	if (action.Is(ACTViewCenterChange) && action.payload.mapID == mapID) {
		//return {...state, focusNode: action.payload.focusNode, viewOffset: action.payload.viewOffset};
		
		let nodes = GetTreeNodesInObjTree(state, true);
		let focusNode = nodes.FirstOrX(a=>a.Value && a.Value.focused);
		let result = state;
		if (focusNode)
			result = u.updateIn(focusNode.PathStr_Updeep, u.omit(["focused", "viewOffset"]), result);
		
		let targetNodePath = GetPathNodes(action.payload.focusNodePath).join(".children.");
		result = u.updateIn(targetNodePath, (old = new MapNodeView())=>({...old, focused: true, viewOffset: action.payload.viewOffset}), result);
		return result;
	}
	return state;
}