import {CreateAccessor} from "mobx-graphlink";
import {O} from "web-vcore";

export class RatingUIState {
	@O accessor showOptionalRatings = false;
	@O accessor smoothing = 5;
}

export const GetRatingUISmoothing = CreateAccessor({ctx: 1}, function() {
	return this.store.main.ratingUI.smoothing;
});