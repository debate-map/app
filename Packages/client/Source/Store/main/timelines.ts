import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";
import {ignore} from "web-vcore/nm/mobx-sync.js";

export class TimelinesState {
	constructor() { makeObservable(this); }
	@O nodeRevealHighlightTime = 20;
	@O hideEditingControls = false;
	@O showFocusNodes = false;
	@O layoutHelperMap_load = false;
	@O layoutHelperMap_show = false;
	@O @ignore autoScroll = true;
}