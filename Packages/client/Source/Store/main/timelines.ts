import {O} from "web-vcore";
import {makeObservable} from "web-vcore/nm/mobx";
import {ignore} from "web-vcore/nm/mobx-sync.js";

export class TimelinesState {
	constructor() { makeObservable(this); }

	// editor
	@O audioMode = true;
	@O audioPanel = new AudioPanelState();

	// playing
	@O recordPanel = new RecordPanelState();
	@O nodeRevealHighlightTime = 20;
	@O hideEditingControls = false;
	@O showFocusNodes = false;
	@O layoutHelperMap_load = false;
	@O layoutHelperMap_show = false;
	@O @ignore autoScroll = true;
}

class AudioPanelState {
	constructor() { makeObservable(this); }
	@O selectedFile: string|n;

	@O waveformRows = 0;
	@O @ignore selection_start = 0;
	//@O @ignore selection_end = 0;
	@O playOnClick = true;

	@O @ignore wavesurferStateChangedAt = 0;
	@O @ignore act_startPlayAtTimeX = 0;
}

class RecordPanelState {
	constructor() { makeObservable(this); }
	@O @ignore recording = false;
}