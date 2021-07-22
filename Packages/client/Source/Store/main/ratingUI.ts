import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {O} from "web-vcore";

export class RatingUIState {
	@O smoothing = 5;
}

export const GetRatingUISmoothing = CreateAccessor(function() {
	return this!.store.main.ratingUI.smoothing;
});