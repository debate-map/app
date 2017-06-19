import {GetNode} from "../../firebase/nodes";
import Action from "../../../Frame/General/Action";

export class ACTSelectedNode_InListSet extends Action<{mapID: number, nodeID: number}> {}

export function MapInfoReducer(state = null, action: Action<any>, mapID: number) {
	if (action.Is(ACTSelectedNode_InListSet)) return {...state, list_selectedNodeID: action.payload.nodeID};
	return state;
}

export function GetSelectedNodeID_InList(mapID: number) {
	return State("main", "maps", mapID, "list_selectedNodeID");
}
export function GetSelectedNode_InList(mapID: number) {
	let nodeID = GetSelectedNodeID_InList(mapID);
	return GetNode(nodeID);
}