import {CreateAccessor} from "mobx-graphlink";
import {O} from "web-vcore";
import {makeObservable} from "mobx";

export class RatingUIState {
	constructor() { makeObservable(this); }
	@O showOptionalRatings = false;
	@O smoothing = 5;
}

export const GetRatingUISmoothing = CreateAccessor({ctx: 1}, function() {
	return this.store.main.ratingUI.smoothing;
});