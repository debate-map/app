import {GetImages} from "../firebase/images";
import {GetTerms} from "../firebase/terms";
import Action from "../../Frame/General/Action";
import {CombineReducers} from "../../Frame/Store/ReducerUtils";
import { MapType } from "../firebase/maps/@Map";
import {GetMapsOfType, GetMap} from "Store/firebase/maps";
import {URL} from "../../Frame/General/URLs";
import {IsNumber} from "../../Frame/General/Types";
import SubpageReducer from "./@Shared/$subpage";

export class ACTDebateMapSelect extends Action<{id: number}> {}
export class ACTDebateMapSelect_WithData extends Action<{id: number, rootNodeID: number}> {}

export class Debates {
	//subpage: string;
	selectedDebateMapID: number;
}

export const DebatesReducer = CombineReducers({
	//subpage: SubpageReducer("debates"),
	selectedDebateMapID: (state = null, action)=> {
		//if (action.Is(ACTDebateMapSelect)) return action.payload.id;
		if (action.Is(ACTDebateMapSelect_WithData)) return action.payload.id;
		/*if (action.type == LOCATION_CHANGED) {
			let id = parseInt(URL.FromState(action.payload).pathNodes[1]);
			if (IsNumber(id)) return id;
		}*/
		return state;
	},
});

export function GetSelectedDebateMapID() {
	return State(a=>a.main.debates.selectedDebateMapID);
}
export function GetSelectedDebateMap() {
	let selectedID = GetSelectedDebateMapID();
	//return GetData(`maps/${selectedID}`);
	//return (GetMapsOfType(MapType.Debate) || []).find(a=>a._id == selectedID);
	return GetMap(selectedID);
}