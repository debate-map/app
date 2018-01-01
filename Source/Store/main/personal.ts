import {GetImages} from "../firebase/images";
import {GetTerms} from "../firebase/terms";
import Action from "../../Frame/General/Action";
import {CombineReducers} from "../../Frame/Store/ReducerUtils";
import {MapType, Map} from "../firebase/maps/@Map";
import {GetMapsOfType, GetMap} from "Store/firebase/maps";
import {VURL} from "js-vextensions";
import {IsNumber} from "js-vextensions";
import SubpageReducer from "./@Shared/$subpage";

export class ACTPersonalMapSelect extends Action<{id: number}> {}
export class ACTPersonalMapSelect_WithData extends Action<{id: number, map: Map}> {}

export class Personal {
	//subpage: string;
	selectedMapID: number;
}

export const PersonalReducer = CombineReducers({
	//subpage: SubpageReducer("personal"),
	selectedMapID: (state = null, action)=> {
		//if (action.Is(ACTPersonalMapSelect)) return action.payload.id;
		if (action.Is(ACTPersonalMapSelect_WithData) && (action.payload.map == null || action.payload.map.type == MapType.Personal)) return action.payload.id;
		return state;
	},
});

export function GetSelectedPersonalMapID() {
	return State(a=>a.main.personal.selectedMapID);
}
export function GetSelectedPersonalMap() {
	let selectedID = GetSelectedPersonalMapID();
	return GetMap(selectedID);
}