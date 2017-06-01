import {ACTSetSubpage} from "../../main";

export default function SubpageReducer(page: string) {
	return (state = null, action)=> {
		if (action.Is(ACTSetSubpage) && action.payload.page == page) return action.payload.subpage;
		return state;
	};
}