import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";
import {ignore} from "web-vcore/nm/mobx-sync.js";

export class TimelinesState {
	constructor() { makeObservable(this); }
	@O nodeRevealHighlightTime = 20;
	@O @ignore autoScroll = true;
}