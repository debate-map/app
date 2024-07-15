import {O} from "web-vcore";
import {makeObservable} from "mobx";

export class GuideState {
	constructor() { makeObservable(this); }

	@O tourDotStates = new TourDotClicks();
}

// the value for each field is the "time of being completed (ie. clicked and closed)" for the given tour dot/entry
export class TourDotClicks {
	constructor() { makeObservable(this); }

	@O nodeUI_expandButton: number|n;
}