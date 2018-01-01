import {GetImages} from "../firebase/images";
import {GetTerms} from "../firebase/terms";
import Action from "../../Frame/General/Action";
import {CombineReducers} from "../../Frame/Store/ReducerUtils";
import {Vector2i} from "js-vextensions";
import SubpageReducer from "./@Shared/$subpage";

export class ACTTermSelect extends Action<{id: number}> {}
export class ACTImageSelect extends Action<{id: number}> {}

export class Database {
	subpage: string;
	selectedTermID: number;
	//selectedTermComponentID: number;
	selectedImageID: number;
}

export const DatabaseReducer = CombineReducers({
	subpage: SubpageReducer("database"),
	selectedTermID: (state = null, action)=> {
		if (action.Is(ACTTermSelect))
			return action.payload.id;
		return state;
	},
	/*selectedTermComponent: (state = null, action)=> {
		if (action.Is(ACTTermSelect))
			return action.payload.id;
		return state;
	},*/
	selectedImageID: (state = null, action)=> {
		if (action.Is(ACTImageSelect))
			return action.payload.id;
		return state;
	},
});

export function GetSelectedTermID() {
	return State(a=>a.main.database.selectedTermID);
}
export function GetSelectedTerm() {
	let selectedID = GetSelectedTermID();
	//return GetData(`terms/${selectedID}`);
	return (GetTerms() || []).find(a=>a._id == selectedID);
}
/*export function GetSelectedTermComponent() {
	let selectedID = State().main.selectedTermComponent;
	return GetTermComponent(selectedID);
}*/

export function GetSelectedImageID() {
	return State(a=>a.main.database.selectedImageID);
}
export function GetSelectedImage() {
	let selectedID = GetSelectedImageID();
	//return GetData(`terms/${selectedID}`);
	return (GetImages() || []).find(a=>a._id == selectedID);
}