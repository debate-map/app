import {RootNodeViewsReducer} from "./$mapView/rootNodeViews";
import Action from "../../../Frame/General/Action";
import {MapView} from "./@MapViews";
import {ShallowEquals} from "../../../Frame/UI/ReactGlobals";
import {FromJSON, ToJSON} from "../../../Frame/General/Globals";
import {GetTreeNodesInObjTree} from "../../../Frame/V/V";
import {IsPrimitive} from "../../../Frame/General/Types";
import * as u from "updeep";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";

/*export let MapViewReducer = CombineReducers(()=>({rootNodeViews: {}}), {
	rootNodeViews: RootNodeViewsReducer,
});*/

export class ACTMapViewMerge extends Action<{mapID: number, mapView: MapView}> {}

export function MapViewReducer(state = {rootNodeViews: {}}, action: Action<any>, mapID: number) {
	if (action.Is(ACTMapViewMerge) && action.payload.mapID == mapID) {
		let newState = state;
		let updatePrimitiveTreeNodes = GetTreeNodesInObjTree(action.payload.mapView).Where(a=>IsPrimitive(a.Value) || a.Value == null);
		for (let updatedNode of updatePrimitiveTreeNodes)
			newState = u.updateIn(updatedNode.PathStr_Updeep, updatedNode.Value, newState);
		return newState;
	}

	let newState = {...state, rootNodeViews: RootNodeViewsReducer(state.rootNodeViews, action, mapID)};
	if (!ShallowEquals(state, newState))
		return newState;
	return state;
}