import {O} from "vwebapp-framework";
import {ignore} from "mobx-sync";

export class TimelinesState {
	@O nodeRevealHighlightTime = 20;
	@O @ignore autoScroll = true;
}