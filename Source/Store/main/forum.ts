import {GetImages} from "../firebase/images";
import {GetTerms} from "../firebase/terms";
import Action from "../../Frame/General/Action";
import {CombineReducers} from "../../Frame/Store/ReducerUtils";
import { MapType } from "../firebase/maps/@Map";
import { GetMapsOfType } from "Store/firebase/maps";
import {URL} from "../../Frame/General/URLs";
import {IsNumber} from "../../Frame/General/Types";
import SubpageReducer from "./@Shared/$subpage";
import {GetSubforum} from "../firebase/forum";

export class ACTSubforumSelect extends Action<{id: number}> {}

export class Forum {
	selectedSubforumID: number;
}

export const ForumReducer = CombineReducers({
	selectedSubforumID: (state = null, action)=> {
		if (action.Is(ACTSubforumSelect)) return action.payload.id;
		return state;
	},
});

export function GetSelectedSubforumID() {
	return State(a=>a.main.forum.selectedSubforumID);
}
export function GetSelectedSubforum() {
	let selectedID = GetSelectedSubforumID();
	return GetSubforum(selectedID);
}