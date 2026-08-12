import {O} from "web-vcore";

export class GuideState {
	@O accessor tourDotStates = new TourDotClicks();
}

// the value for each field is the "time of being completed (ie. clicked and closed)" for the given tour dot/entry
export class TourDotClicks {
	@O accessor nodeUI_expandButton: number|n;
}