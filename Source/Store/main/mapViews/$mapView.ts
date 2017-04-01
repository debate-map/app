import {MapView} from "./@MapViews";
import Action from "../../../Frame/General/Action";
import {ACTMapNodeSelect, ACTMapNodePanelOpen} from "../mapViews";
import {GetTreeNodesInObjTree} from "../../../Frame/V/V";
import u from "updeep";
import {combineReducers} from "redux";
import {CombineReducers} from "../../index";
import {RootNodeViewsReducer} from "./$mapView/rootNodeViews";

export let MapViewReducer = CombineReducers(()=>({rootNodeViews: {}}), {
	rootNodeViews: RootNodeViewsReducer,
});