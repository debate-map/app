import {O} from "vwebapp-framework";
import {ignore} from "web-vcore/nm/mobx-sync";

export class TimelinesState {
	@O nodeRevealHighlightTime = 20;
	@O @ignore autoScroll = true;
}