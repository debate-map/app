import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";

export class RatingUIState {
	constructor() { makeObservable(this); }
	@O showOptionalRatings = false;
	@O smoothing = 5;
}

export const GetRatingUISmoothing = CreateAccessor(function() {
	return this!.store.main.ratingUI.smoothing;
});