import {GetNode} from "../../firebase/nodes";
import Action from "../../../Frame/General/Action";
import {MapInfo} from "./@MapInfo";
import {CombineReducers} from "../../../Frame/Store/ReducerUtils";

export class ACTSelectedNode_InListSet extends Action<{mapID: number, nodeID: number}> {}
export class ACTMap_List_SelectedNode_OpenPanelSet extends Action<{mapID: number, panel: string}> {}

/*export function MapInfoReducer(state = null, action: Action<any>, mapID: number): MapInfo {
	if (action.Is(ACTSelectedNode_InListSet)) return {...state, list_selectedNodeID: action.payload.nodeID};
	return state;
}*/

export const MapInfoReducer = CombineReducers({
	list_selectedNodeID: (state = null, action)=> {
		if (action.Is(ACTSelectedNode_InListSet)) return action.payload.nodeID;
		return state;
	},
	list_selectedNode_openPanel: (state = null, action)=> {
		if (action.Is(ACTMap_List_SelectedNode_OpenPanelSet)) return action.payload.panel;
		return state;
	},
});

export function GetSelectedNodeID_InList(mapID: number) {
	return State("main", "maps", mapID, "list_selectedNodeID");
}
export function GetSelectedNode_InList(mapID: number) {
	let nodeID = GetSelectedNodeID_InList(mapID);
	return GetNode(nodeID);
}

export function GetMap_List_SelectedNode_OpenPanel(mapID: number) {
	return State("main", "maps", mapID, "list_selectedNode_openPanel");
}