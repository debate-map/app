import {StoreAccessor} from "web-vcore/nm/mobx-graphlink";
import {O} from "vwebapp-framework";

export class RatingUIState {
	@O smoothing = 5;
}

export const GetRatingUISmoothing = StoreAccessor(s=>()=>{
	return s.main.ratingUI.smoothing;
});